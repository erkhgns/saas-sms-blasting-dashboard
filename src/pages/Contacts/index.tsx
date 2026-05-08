import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Upload, Plus, Trash2, Ban, Pencil, CheckCircle2, AlertCircle, Braces, ArrowUpRight, Download } from "lucide-react";
import { PageHeader, PrimaryButton, AvatarInitials } from "@/components/common";
import { BRAND, TAG_COLORS } from "@/utils";
import { useContacts, useContactGroups, useTokens } from "@/hooks";
import { contactsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import { EditContactDrawer } from "./EditContactDrawer";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import type { Contact, ImportContactsResponse } from "@/types";

export function Contacts() {
  const senderId = authStore.getUser()?.id ?? "";
  const STORAGE_KEY = `contacts.visibleCustomCols.${senderId}`;

  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [tagFilter, setTagFilter]     = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // null = drawer closed; "new" = create mode; Contact = edit mode
  const [drawerContact, setDrawerContact] = useState<Contact | null | "new">(null);
  const editingContact = drawerContact === "new" ? null : drawerContact;
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting]         = useState(false);
  const [togglingOptOutId, setTogglingOptOutId] = useState<string | null>(null);
  const [importing, setImporting]               = useState(false);
  const [importResult, setImportResult]         = useState<ImportContactsResponse | null>(null);
  const [visibleCustomCols, setVisibleCustomCols] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Persist column visibility to localStorage per sender
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setVisibleCustomCols(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [senderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCustomCols));
  }, [visibleCustomCols, senderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { contacts, meta, loading, error, refetch } = useContacts({
    page, limit: 10,
    search: search.trim() || undefined,
    tag:    tagFilter || undefined,
  });

  const { groups } = useContactGroups();
  const { tokens } = useTokens();

  // Tokens that are currently toggled visible
  const visibleTokens = useMemo(
    () => tokens.filter((t) => visibleCustomCols.includes(t.key)),
    [tokens, visibleCustomCols]
  );

  // Coverage: % of (contacts × visible token) cells that are filled
  const coveragePct = useMemo(() => {
    if (visibleTokens.length === 0 || contacts.length === 0) return null;
    let filled = 0, total = 0;
    contacts.forEach((c) => {
      visibleTokens.forEach((t) => {
        total++;
        const v = c.customFields?.[t.key];
        if (v && String(v).trim()) filled++;
      });
    });
    return total > 0 ? Math.round((filled / total) * 100) : 0;
  }, [contacts, visibleTokens]);

  // ── Selection helpers ──────────────────────────────────────────────
  const allSelected = contacts.length > 0 && selectedIds.length === contacts.length;

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : contacts.map((c) => c.id));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ── Handlers ───────────────────────────────────────────────────────
  const handleSearch = (value: string) => { setSearch(value); setPage(1); setSelectedIds([]); };
  const handleTagFilter = (value: string) => { setTagFilter(value); setPage(1); setSelectedIds([]); };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await contactsService.delete(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refetch();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await contactsService.bulkDelete({ ids: selectedIds, senderId });
      setSelectedIds([]);
      refetch();
    } catch (err) {
      console.error("Bulk delete failed", err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleOptOut = async (id: string, current: boolean) => {
    setTogglingOptOutId(id);
    try {
      await contactsService.optOut(id, { optedOut: !current });
      refetch();
    } catch (err) {
      console.error("Opt-out toggle failed", err);
    } finally {
      setTogglingOptOutId(null);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportResult(null);
    setImporting(true);
    try {
      const result = await contactsService.importCsv(file, senderId);
      setImportResult(result);
      refetch();
    } catch (err) {
      console.error("Import failed", err);
    } finally {
      setImporting(false);
    }
  };

  // Total column count for skeleton/empty colSpan
  const totalCols = 6 + visibleTokens.length;

  return (
    <div className="p-8">
      <PageHeader
        title="Contacts"
        subtitle="Manage your contact database"
        actions={
          <>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <button
              onClick={() => {
                const csv = [
                  "name,phone,email,tags",
                  'Maria Santos,09171234567,maria@example.com,"VIP,Repeat Customer"',
                  "Juan Dela Cruz,+639181234567,,Reseller",
                  "Pedro Reyes,09191234567,,",
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = "contacts-template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="font-medium">CSV Template</span>
            </button>
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">{importing ? "Importing..." : "Import CSV"}</span>
            </button>
            <PrimaryButton onClick={() => setDrawerContact("new")}>
              <Plus className="w-5 h-5" />
              Add Contact
            </PrimaryButton>
          </>
        }
      />

      {/* CSV import result banner */}
      {importResult && (
        <div className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-start gap-3 ${
          importResult.skipped > 0
            ? "bg-yellow-50 border-yellow-200 text-yellow-800"
            : "bg-green-50 border-green-200 text-green-800"
        }`}>
          {importResult.skipped > 0
            ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <div>
            <p className="font-medium">
              {importResult.imported} contact{importResult.imported !== 1 ? "s" : ""} imported successfully
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
            </p>
            {importResult.skippedReasons.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs opacity-80">
                {importResult.skippedReasons.map((r) => (
                  <li key={r.row}>Row {r.row} ({r.phone}): {r.reason}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setImportResult(null)}
            className="ml-auto pl-2 opacity-60 hover:opacity-100 transition-opacity"
          >✕</button>
        </div>
      )}

      {/* Custom-field coverage card — only when columns are visible */}
      {visibleTokens.length > 0 && coveragePct !== null && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-gradient-to-r from-orange-50 to-orange-50/40 border border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Braces className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Showing {visibleTokens.length} custom field{visibleTokens.length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-orange-700">{coveragePct}%</span> of cells
                filled — empty values use fallbacks during sends
              </div>
            </div>
          </div>
          <a
            href="#"
            className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
          >
            Manage fields
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4">
        <div className="p-4 flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting ? "Deleting..." : `Delete (${selectedIds.length})`}
            </button>
          )}

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search contacts by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              style={{ outline: "none" }}
              onFocus={(e) => {
                e.target.style.borderColor = BRAND.primary;
                e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 46, 0.2)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <select
            value={tagFilter}
            onChange={(e) => handleTagFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white text-sm"
            style={{ outline: "none" }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id === "all" ? "" : g.id}>
                {g.name} ({g.count.toLocaleString()})
              </option>
            ))}
            {groups.length === 0 && <option value="">All Tags</option>}
          </select>

          {/* Column visibility menu */}
          <ColumnVisibilityMenu
            visibleCustomCols={visibleCustomCols}
            setVisibleCustomCols={setVisibleCustomCols}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table — wrapped for horizontal scroll when custom cols appear */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-left">
                  <input
                    type="checkbox"
                    className="w-4 h-4 border-gray-300 rounded"
                    style={{ accentColor: BRAND.primary }}
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>

                {/* Custom field column headers — orange tint to distinguish from core cols */}
                {visibleTokens.map((t) => (
                  <th
                    key={t.key}
                    className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "#9a3412", backgroundColor: "#fff7ed" }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Braces className="w-3 h-3" />
                      {t.label}
                    </div>
                  </th>
                ))}

                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: totalCols }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="px-6 py-16 text-center text-gray-500 text-sm">
                    {search || tagFilter
                      ? "No contacts match your search."
                      : "No contacts yet. Add your first contact or import a CSV."}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedIds.includes(contact.id);
                  return (
                    <tr
                      key={contact.id}
                      onClick={() => setDrawerContact(contact)}
                      className={`hover:bg-orange-50/30 cursor-pointer transition-colors ${
                        contact.optedOut ? "opacity-60" : ""
                      } ${isSelected ? "bg-orange-50/50" : ""}`}
                    >
                      {/* Checkbox — stopPropagation so row click doesn't fire */}
                      <td
                        className="px-6 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 border-gray-300 rounded"
                          style={{ accentColor: BRAND.primary }}
                          checked={isSelected}
                          onChange={() => toggleSelect(contact.id)}
                        />
                      </td>

                      {/* Name + email */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={contact.name} size="md" />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{contact.name}</div>
                            {contact.email && (
                              <div className="text-xs text-gray-500 truncate">{contact.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-3.5 text-gray-700 font-mono text-sm whitespace-nowrap">
                        {contact.phone}
                      </td>

                      {/* Tags */}
                      <td className="px-6 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.length > 0 ? (
                            contact.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  TAG_COLORS[tag] ?? "bg-gray-50 text-gray-700 border-gray-200"
                                }`}
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5">
                        {contact.optedOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200">
                            <Ban className="w-3 h-3" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Custom field cells */}
                      {visibleTokens.map((t) => {
                        const v = contact.customFields?.[t.key];
                        const filled = v != null && String(v).trim() !== "";
                        return (
                          <td key={t.key} className="px-6 py-3.5 text-sm whitespace-nowrap">
                            {filled ? (
                              <span className="text-gray-900">{v}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Actions — stopPropagation so row click doesn't fire */}
                      <td
                        className="px-6 py-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDrawerContact(contact)}
                            title="Edit contact"
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleToggleOptOut(contact.id, contact.optedOut)}
                            disabled={togglingOptOutId === contact.id}
                            title={contact.optedOut ? "Remove opt-out" : "Mark as opted out"}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Ban className={`w-4 h-4 ${contact.optedOut ? "text-red-500" : "text-gray-400 hover:text-red-500"}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            disabled={deletingId === contact.id}
                            title="Delete contact"
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                          >
                            <Trash2 className={`w-4 h-4 group-hover:text-red-600 ${deletingId === contact.id ? "text-red-400 animate-pulse" : "text-gray-400"}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {meta ? (
            <>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {(meta.page - 1) * meta.limit + 1}
              </span>
              {" "}to{" "}
              <span className="font-medium text-gray-900">
                {Math.min(meta.page * meta.limit, meta.total)}
              </span>
              {" "}of{" "}
              <span className="font-medium text-gray-900">
                {meta.total.toLocaleString()}
              </span>{" "}contacts
            </>
          ) : "Loading..."}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!meta || meta.page <= 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta || meta.page >= meta.totalPages}
            className="px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E55829")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Drawer — handles both create (contact=null) and edit (contact=Contact) */}
      {drawerContact !== null && (
        <EditContactDrawer
          contact={editingContact}
          onClose={() => setDrawerContact(null)}
          onSuccess={() => { refetch(); if (editingContact === null) setPage(1); }}
        />
      )}
    </div>
  );
}
