import { useState, useRef } from "react";
import { Plus, GripVertical, Pencil, Trash2, Copy, AlertTriangle, Loader2 } from "lucide-react";
import { TriggerBadge, ActionChips, ToggleSwitch, FREQ_SHORT } from "./AutomationAtoms";
import { DeleteModal } from "./DeleteModal";
import { authStore } from "@/utils/auth.store";
import type { AutomationRule, AutomationSettings, ReorderRulesPayload } from "@/types";
import type { Tag } from "@/types";

interface RulesTabProps {
  rules: AutomationRule[];
  settings: AutomationSettings | null;
  tags: Tag[];
  onToggle: (ruleId: string, isEnabled: boolean) => Promise<void>;
  onPause: (paused: boolean) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
  onDuplicate: (ruleId: string) => Promise<AutomationRule>;
  onReorder: (payload: ReorderRulesPayload) => Promise<void>;
  onEdit: (rule: AutomationRule) => void;
  onCreate: () => void;
  pushToast: (msg: string, kind?: "success" | "error") => void;
}

export function RulesTab({
  rules,
  settings,
  tags,
  onToggle,
  onPause,
  onDelete,
  onDuplicate,
  onReorder,
  onEdit,
  onCreate,
  pushToast,
}: RulesTabProps) {
  const senderId = authStore.getUser()?.id ?? "";

  // ── Delete state ───────────────────────────────────────────────────────────
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  // ── In-flight toggle tracking (prevents double-tap) ───────────────────────
  const [togglingIds,   setTogglingIds]   = useState<Set<string>>(new Set());

  // ── In-flight duplicate tracking ──────────────────────────────────────────
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // ── Saving order indicator ─────────────────────────────────────────────────
  const [savingOrder, setSavingOrder] = useState(false);

  // ── HTML5 Drag-to-reorder state ────────────────────────────────────────────
  const dragIndex  = useRef<number | null>(null);
  const canDrag    = useRef(false);            // gate: only allow drag from handle
  const [dragOver,    setDragOver]   = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  const empty        = rules.length === 0;
  const disabledCount = rules.filter((r) => !r.isEnabled).length;
  const isPaused     = settings?.automationsPaused ?? false;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleToggle(rule: AutomationRule) {
    if (togglingIds.has(rule.id)) return;
    setTogglingIds((prev) => new Set(prev).add(rule.id));
    try {
      await onToggle(rule.id, !rule.isEnabled);
    } catch {
      pushToast("Failed to update rule status.", "error");
    } finally {
      setTogglingIds((prev) => { const s = new Set(prev); s.delete(rule.id); return s; });
    }
  }

  async function handlePause() {
    try {
      await onPause(!isPaused);
      pushToast(
        !isPaused ? "All automations paused." : "All automations resumed."
      );
    } catch {
      pushToast("Failed to update automation status.", "error");
    }
  }

  async function handleDeleteConfirm() {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(ruleToDelete.id);
      pushToast("Rule deleted.");
      setRuleToDelete(null);
    } catch {
      pushToast("Failed to delete rule.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDuplicate(rule: AutomationRule) {
    if (duplicatingId) return;
    setDuplicatingId(rule.id);
    try {
      await onDuplicate(rule.id);
      pushToast(`"${rule.name}" duplicated.`);
    } catch {
      pushToast("Failed to duplicate rule.", "error");
    } finally {
      setDuplicatingId(null);
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, index: number, ruleId: string) {
    if (!canDrag.current) { e.preventDefault(); return; }
    dragIndex.current = index;
    setActiveDragId(ruleId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const fromIndex = dragIndex.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      resetDragState();
      return;
    }

    // Build reordered array
    const reordered = [...rules];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Build payload: assign sortOrder in increments of 10
    const payload: ReorderRulesPayload = {
      senderId,
      order: reordered.map((r, i) => ({ id: r.id, sortOrder: (i + 1) * 10 })),
    };

    resetDragState();
    setSavingOrder(true);
    onReorder(payload)
      .catch(() => pushToast("Failed to save new order.", "error"))
      .finally(() => setSavingOrder(false));
  }

  function handleDragEnd() {
    canDrag.current = false;
    resetDragState();
  }

  function resetDragState() {
    dragIndex.current = null;
    setDragOver(null);
    setActiveDragId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header controls row ── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* Left: rule count + saving indicator */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {!empty && (
            <span>
              {rules.length} rule{rules.length !== 1 ? "s" : ""}
              {disabledCount > 0 && ` · ${disabledCount} disabled`}
            </span>
          )}
          {savingOrder && (
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving order…
            </span>
          )}
        </div>

        {/* Right: global pause toggle + Create Rule */}
        <div className="flex items-center gap-4">
          {/* Pause All pill */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg border transition-colors ${
              empty
                ? "opacity-50 pointer-events-none"
                : isPaused
                ? "border-amber-300 bg-amber-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`text-sm font-medium whitespace-nowrap ${
                isPaused ? "text-amber-800" : "text-gray-700"
              }`}
            >
              {isPaused ? "All automations paused" : "All automations active"}
            </span>
            <ToggleSwitch
              checked={!isPaused}
              onChange={handlePause}
              disabled={empty}
              size="sm"
            />
          </div>

          {/* Create Rule button */}
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
        </div>
      </div>

      {/* ── Global pause banner ── */}
      {isPaused && !empty && (
        <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            All automations are currently paused. Individual rules are saved but will not
            trigger until you resume them above.
          </span>
        </div>
      )}

      {/* ── Empty state ── */}
      {empty ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            {/* Zap icon inline — same as import at top of index.tsx */}
            <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No automations yet</h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md">
            Set up rules to automatically send messages, apply tags, or manage
            contacts — triggered by time, token values, or customer replies.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create your first rule
          </button>
        </div>
      ) : (
        /* ── Rules table ── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* drag handle gutter */}
                <th className="w-10" />
                {["Rule Name", "Trigger", "Actions", "Frequency", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                {/* row actions gutter */}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule, i) => {
                const dim      = !rule.isEnabled;
                const isDragging = activeDragId === rule.id;
                const isDropTarget = dragOver === i && activeDragId !== rule.id;

                return (
                  <tr
                    key={rule.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i, rule.id)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`group transition-colors ${
                      isDragging
                        ? "opacity-50 bg-orange-50/60"
                        : "hover:bg-orange-50/30"
                    } ${dim ? "bg-gray-50/40" : ""}`}
                    style={
                      isDropTarget
                        ? { boxShadow: "inset 0 2px 0 #FF692E" }
                        : undefined
                    }
                  >
                    {/* Drag handle */}
                    <td className="pl-3 pr-1 py-4 w-10">
                      <button
                        type="button"
                        onMouseDown={() => { canDrag.current = true; }}
                        onMouseUp={() => { canDrag.current = false; }}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 rounded transition-colors"
                        title="Drag to reorder"
                        tabIndex={-1}
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Rule name + condition count */}
                    <td className="px-3 py-4 max-w-[200px]">
                      <div className={`font-medium text-gray-900 truncate ${dim ? "opacity-50" : ""}`}>
                        {rule.name}
                      </div>
                      {rule.conditions.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    {/* Trigger badge */}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <TriggerBadge trigger={rule.triggerType} dim={dim} />
                    </td>

                    {/* Action chips */}
                    <td className="px-3 py-4 max-w-[260px]">
                      <ActionChips actions={rule.actions} tags={tags} dim={dim} />
                    </td>

                    {/* Frequency */}
                    <td className="px-3 py-4 text-sm text-gray-600 whitespace-nowrap">
                      <span className={dim ? "opacity-50" : ""}>
                        {FREQ_SHORT[rule.frequency]}
                      </span>
                    </td>

                    {/* Status toggle */}
                    <td className="px-3 py-4">
                      <div
                        className="flex items-center gap-2"
                        title={
                          isPaused && rule.isEnabled
                            ? "This rule is enabled but all automations are currently paused globally."
                            : undefined
                        }
                      >
                        <ToggleSwitch
                          checked={rule.isEnabled}
                          onChange={() => handleToggle(rule)}
                          disabled={togglingIds.has(rule.id)}
                          size="sm"
                        />
                        {isPaused && rule.isEnabled && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Row actions (duplicate / edit / delete) */}
                    <td className="px-3 py-4 pr-5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(rule)}
                          disabled={!!duplicatingId}
                          className="p-1.5 text-gray-400 hover:text-[#FF692E] hover:bg-orange-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Duplicate rule"
                        >
                          {duplicatingId === rule.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Copy className="w-4 h-4" />
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(rule)}
                          className="p-1.5 text-gray-400 hover:text-[#FF692E] hover:bg-orange-50 rounded-md transition-colors"
                          title="Edit rule"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRuleToDelete(rule)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {ruleToDelete && (
        <DeleteModal
          rule={ruleToDelete}
          deleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setRuleToDelete(null)}
        />
      )}
    </div>
  );
}
