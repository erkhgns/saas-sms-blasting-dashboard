import { Lock } from "lucide-react";

export function InactiveScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-16 bg-gray-50">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-gray-900">This form is no longer active</h2>
      <p className="mt-2 text-[15px] text-gray-500 leading-relaxed max-w-xs">
        The business owner has closed this registration form.
      </p>
      <div className="mt-8 text-[12px] text-gray-300 font-medium tracking-wide">Powered by Gaby SMS</div>
    </div>
  );
}
