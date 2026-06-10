import { Trash2 } from "lucide-react";
import type { GabyForm } from "@/types";

interface DeleteFormModalProps {
  form: GabyForm;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteFormModal({ form, deleting, onConfirm, onCancel }: DeleteFormModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Delete form</h3>
            <p className="text-sm text-gray-600 mt-1">
              Are you sure you want to delete{" "}
              <strong>"{form.name}"</strong>? This cannot be undone.
            </p>
            <p className="text-[13px] text-gray-400 mt-2">
              Contacts already collected through this form stay in your Contacts list.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Deleting…" : "Delete form"}
          </button>
        </div>
      </div>
    </div>
  );
}
