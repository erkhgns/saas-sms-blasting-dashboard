const ACCENT = "#FF692E";
const DEFAULT_MSG = "Thank you for registering! We'll be in touch.";

interface ThankYouScreenProps {
  /** The form's configured message, or null/empty to use the default. */
  thankYouMessage: string;
  /** Business header (shown above the thank you, same as above the form). */
  header: React.ReactNode;
}

export function ThankYouScreen({ thankYouMessage, header }: ThankYouScreenProps) {
  const msg = thankYouMessage?.trim() || DEFAULT_MSG;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {header}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-14">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: ACCENT + "1A" }}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke={ACCENT}
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-gray-900">You're all set!</h2>
        <p className="mt-2.5 text-[15px] text-gray-600 leading-relaxed max-w-xs text-balance">
          {msg}
        </p>
      </div>
      <div className="pb-7 text-center text-[12px] text-gray-300 font-medium tracking-wide">
        Powered by Gaby SMS
      </div>
    </div>
  );
}
