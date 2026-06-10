import { useRef, useState } from "react";
import { X, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { formPublicUrl, formDisplayUrl } from "@/utils/form-url";
import type { GabyForm } from "@/types";

interface QRCodeModalProps {
  form: GabyForm;
  onClose: () => void;
  pushToast: (msg: string, kind?: "success" | "error") => void;
}

export function QRCodeModal({ form, onClose, pushToast }: QRCodeModalProps) {
  const [withLabel, setWithLabel] = useState(true);
  const downloadRef = useRef<HTMLCanvasElement>(null);

  // QR always encodes the short code URL — never the slug — so it stays valid
  // even if the user later renames or removes the custom slug.
  const url = formPublicUrl(form.shortCode);

  function handleDownload() {
    const qrCanvas = downloadRef.current;
    if (!qrCanvas) return;

    const qrSize  = 1000;
    const padding = 50;
    const textH   = withLabel ? 120 : 0;

    const out = document.createElement("canvas");
    out.width  = qrSize + padding * 2;
    out.height = qrSize + padding * 2 + textH;

    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

    if (withLabel) {
      const cx = out.width / 2;
      const y0 = qrSize + padding * 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "#111827";
      ctx.font = "600 46px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
      ctx.fillText(form.name, cx, y0 + 54);
      ctx.fillStyle = "#6b7280";
      ctx.font = "400 34px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(formDisplayUrl(form.shortCode), cx, y0 + 100);
    }

    const a = document.createElement("a");
    a.href     = out.toDataURL("image/png");
    a.download = `${form.slug || form.shortCode}-form-qr.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    pushToast("QR code downloaded.");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Form QR Code</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center">
          {/* Visible QR */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <QRCodeCanvas value={url} size={200} />
          </div>

          {withLabel && (
            <div className="mt-3 text-center">
              <div className="text-sm font-semibold text-gray-900">{form.name}</div>
              <div className="text-[12px] text-gray-500 font-mono">
                {formDisplayUrl(form.shortCode)}
              </div>
            </div>
          )}

          {/* Label toggle */}
          <label className="mt-4 flex items-center gap-2.5 text-sm text-gray-600 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={withLabel}
              onClick={() => setWithLabel((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF692E]/40 ${
                withLabel ? "bg-[#FF692E]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  withLabel ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            Include name label below code
          </label>

          <p className="mt-3 text-[12px] text-gray-400 text-center leading-relaxed">
            Encodes the short link{" "}
            <span className="font-mono text-gray-500">
              {formDisplayUrl(form.shortCode)}
            </span>{" "}
            — works even if you change the custom slug later. Exports at 1100×1100px for print.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF692E] hover:bg-[#e55a24] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>

      {/* Hidden high-res canvas for download (1000px) */}
      <div style={{ position: "absolute", left: -9999, top: -9999, pointerEvents: "none" }}>
        <QRCodeCanvas ref={downloadRef} value={url} size={1000} />
      </div>
    </div>
  );
}
