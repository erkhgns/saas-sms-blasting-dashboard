import { useState } from "react";
import { CheckCircle, AlertTriangle, FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/common";
import { useAutomations } from "@/hooks/useAutomations";
import { useTags } from "@/hooks/useTags";
import { useTokens } from "@/hooks/useTokens";
import { RulesTab } from "./RulesTab";
import { RuleDrawer } from "./RuleDrawer";
import { LogTab } from "./LogTab";
import { authStore } from "@/utils/auth.store";
import type { AutomationRule } from "@/types";

type AutomationsTab = "rules" | "log";

// ── Simple in-page toast ──────────────────────────────────────────────────────

interface Toast {
  id: string;
  msg: string;
  kind: "success" | "error";
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (msg: string, kind: "success" | "error" = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3200
    );
  };
  return { toasts, pushToast };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Automations() {
  const [activeTab, setActiveTab] = useState<AutomationsTab>("rules");

  // ── Data ────────────────────────────────────────────────────────────────────
  const {
    rules,
    settings,
    loading,
    error,
    refetch,
    setPaused,
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
    duplicateRule,
    reorderRules,
  } = useAutomations();

  const { tags }   = useTags();
  const { tokens } = useTokens();
  const senderId   = authStore.getUser()?.id ?? "";

  // ── Toast ────────────────────────────────────────────────────────────────────
  const { toasts, pushToast } = useToast();

  // ── Drawer state ────────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  function openCreate() { setEditingRule(null); setDrawerOpen(true); }
  function openEdit(rule: AutomationRule) { setEditingRule(rule); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <PageHeader
        title="Automations"
        subtitle="Automate tags, messages, and contact actions based on rules you define."
      />

      {/* ── Beta banner ── */}
      <div className="flex items-start gap-3 px-4 py-3.5 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <FlaskConical className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
        <div>
          <span className="font-semibold">This feature is in Beta.</span>{" "}
          Test your rules thoroughly on non-critical contacts before going live with real customers.
          Unexpected rule behavior may occur — always verify conditions and actions in a safe environment first.
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {(["rules", "log"] as AutomationsTab[]).map((tab) => {
            const label    = tab === "rules" ? "Rules" : "Log";
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-[#FF692E] text-[#FF692E]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          <div className="h-10 w-80 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={refetch}
            className="ml-auto text-red-600 underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Tab content ── */}
      {!loading && !error && (
        <>
          {activeTab === "rules" && (
            <RulesTab
              rules={rules}
              settings={settings}
              tags={tags}
              onToggle={toggleRule}
              onPause={setPaused}
              onDelete={deleteRule}
              onDuplicate={duplicateRule}
              onReorder={reorderRules}
              onEdit={openEdit}
              onCreate={openCreate}
              pushToast={pushToast}
            />
          )}

          {activeTab === "log" && <LogTab rules={rules} tags={tags} />}
        </>
      )}

      {/* ── Toast stack (bottom center) ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-[fadeUp_.2s_ease-out] ${
              t.kind === "error"
                ? "bg-red-600 text-white border-red-700"
                : "bg-gray-900 text-white border-gray-900"
            }`}
          >
            {t.kind === "error" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            {t.msg}
          </div>
        ))}
      </div>

      <RuleDrawer
        open={drawerOpen}
        rule={editingRule}
        tokens={tokens}
        tags={tags}
        senderId={senderId}
        onClose={closeDrawer}
        onCreate={createRule}
        onUpdate={updateRule}
        pushToast={pushToast}
      />
    </div>
  );
}

