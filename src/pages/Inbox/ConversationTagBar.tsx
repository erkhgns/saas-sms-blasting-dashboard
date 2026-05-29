import { useState, useRef, useEffect } from "react";
import { Plus, X, Search } from "lucide-react";
import type { Contact, Tag } from "@/types";

// ── TagPickerPopover ──────────────────────────────────────────────────────────

interface TagPickerPopoverProps {
  currentTags: string[];
  allTags: Tag[];
  onAdd: (tagName: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

function TagPickerPopover({
  currentTags,
  allTags,
  onAdd,
  onClose,
  anchorRef,
}: TagPickerPopoverProps) {
  const [search, setSearch] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = allTags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      !currentTags.includes(t.name)
  );

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags…"
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
          />
        </div>
      </div>

      {/* Tag list */}
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            {search ? "No matching tags" : "All tags already applied"}
          </div>
        ) : (
          filtered.map((tag) => (
            <button
              key={tag.id}
              onClick={() => {
                onAdd(tag.name);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color ?? "#d1d5db" }}
              />
              <span className="text-sm text-gray-700">{tag.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── ConversationTagBar ────────────────────────────────────────────────────────

interface ConversationTagBarProps {
  contact: Contact | null;
  allTags: Tag[];
  onTagsChange: (newTags: string[]) => Promise<void>;
  onSaveContact: () => void;
}

export function ConversationTagBar({
  contact,
  allTags,
  onTagsChange,
  onSaveContact,
}: ConversationTagBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving]         = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Unknown number — amber strip
  if (!contact) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 border-t border-amber-200 flex-shrink-0">
        <span className="text-xs text-amber-700">Unknown number —</span>
        <button
          onClick={onSaveContact}
          className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
        >
          Save contact →
        </button>
      </div>
    );
  }

  const currentTags = contact.tags ?? [];

  const handleRemove = async (tagName: string) => {
    setSaving(true);
    try {
      await onTagsChange(currentTags.filter((t) => t !== tagName));
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (tagName: string) => {
    setSaving(true);
    try {
      await onTagsChange([...currentTags, tagName]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex-wrap flex-shrink-0 min-h-[42px]">
      {/* Current tag chips */}
      {currentTags.map((tagName) => {
        const color = allTags.find((t) => t.name === tagName)?.color ?? null;
        return (
          <span
            key={tagName}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-700"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: color ?? "#d1d5db" }}
            />
            {tagName}
            <button
              onClick={() => handleRemove(tagName)}
              disabled={saving}
              className="hover:opacity-60 transition-opacity disabled:opacity-30 text-gray-400 hover:text-gray-600"
              title={`Remove ${tagName}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {/* Add tag button + popover */}
      <div className="relative">
        <button
          ref={addButtonRef}
          onClick={() => setPickerOpen((v) => !v)}
          disabled={saving}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-400 border border-dashed border-gray-300 hover:border-orange-400 hover:text-orange-500 transition-colors disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add tag
        </button>

        {pickerOpen && (
          <TagPickerPopover
            currentTags={currentTags}
            allTags={allTags}
            onAdd={handleAdd}
            onClose={() => setPickerOpen(false)}
            anchorRef={addButtonRef}
          />
        )}
      </div>
    </div>
  );
}
