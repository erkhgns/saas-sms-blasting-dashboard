import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, ArrowLeft, CheckCircle, MessageSquare } from "lucide-react";
import { BRAND } from "@/utils";
import { authService } from "@/services/auth.service";
import logoMark from "/logo-mark@2x.png";

type View = "login" | "forgot" | "reset" | "success";

const focusStyle = { borderColor: BRAND.primary, boxShadow: "0 0 0 2px rgba(255, 105, 46, 0.2)" };
const blurStyle  = { borderColor: "#d1d5db", boxShadow: "none" };

function useFocusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => Object.assign(e.target.style, focusStyle),
    onBlur:  (e: React.FocusEvent<HTMLInputElement>) => Object.assign(e.target.style, blurStyle),
  };
}

export function Login() {
  const navigate = useNavigate();
  const inputFocus = useFocusHandlers();

  // ── Login state ─────────────────────────────────────────────────────────────
  const [view,         setView]         = useState<View>("login");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError,   setLoginError]   = useState<string | null>(null);

  // ── Forgot state ────────────────────────────────────────────────────────────
  const [phoneNumber,    setPhoneNumber]    = useState("");
  const [forgotLoading,  setForgotLoading]  = useState(false);
  const [forgotError,    setForgotError]    = useState<string | null>(null);

  // ── Reset state ─────────────────────────────────────────────────────────────
  const [otp,             setOtp]             = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [resetLoading,    setResetLoading]    = useState(false);
  const [resetError,      setResetError]      = useState<string | null>(null);
  const [resending,       setResending]       = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const newTooShort     = newPassword.length > 0 && newPassword.length < 8;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await authService.login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      await authService.forgotPassword({ phoneNumber: phoneNumber.trim() });
      // API always returns 200 — advance to reset view regardless
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setResetError(null);
      setView("reset");
    } catch {
      setForgotError("Something went wrong. Please check your connection and try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    setResetError(null);
    try {
      await authService.forgotPassword({ phoneNumber: phoneNumber.trim() });
    } catch { /* swallow — user can retry */ } finally {
      setResending(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (confirmMismatch || newTooShort) return;
    setResetError(null);
    setResetLoading(true);
    try {
      await authService.resetPassword({
        phoneNumber: phoneNumber.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setView("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setResetError(
        msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired") || msg.includes("400")
          ? "Invalid or expired OTP. Please check the code and try again."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setResetLoading(false);
    }
  }

  function goBackToLogin() {
    setView("login");
    setPhoneNumber("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setResetError(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <img src={logoMark} alt="Gaby SMS" className="w-14 h-14 rounded-2xl object-cover" />
            <span className="text-3xl font-semibold text-gray-900">Gaby SMS</span>
          </div>
          {view === "login" && (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back</h1>
              <p className="text-gray-600">Sign in to your account to continue</p>
            </>
          )}
          {view === "forgot" && (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Forgot password?</h1>
              <p className="text-gray-600">Enter your registered phone number to receive an OTP</p>
            </>
          )}
          {view === "reset" && (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset your password</h1>
              <p className="text-gray-600">
                OTP sent to{" "}
                <span className="font-semibold text-gray-800">{phoneNumber}</span>
              </p>
            </>
          )}
          {view === "success" && (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Password reset!</h1>
              <p className="text-gray-600">You can now sign in with your new password</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <>
              {loginError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {loginError}
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    style={{ outline: "none" }}
                    {...inputFocus}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg"
                      style={{ outline: "none" }}
                      {...inputFocus}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotError(null); setView("forgot"); }}
                    className="text-sm font-medium hover:underline"
                    style={{ color: BRAND.primary }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full px-4 py-3 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND.primary }}
                  onMouseEnter={(e) => { if (!loginLoading) e.currentTarget.style.backgroundColor = BRAND.primaryHover; }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
                >
                  {loginLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT VIEW ── */}
          {view === "forgot" && (
            <>
              {forgotError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {forgotError}
                </div>
              )}
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 09171234567"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    style={{ outline: "none" }}
                    {...inputFocus}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Enter the phone number registered to your account. We'll send a 6-digit OTP via SMS.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || !phoneNumber.trim()}
                  className="w-full px-4 py-3 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND.primary }}
                  onMouseEnter={(e) => { if (!forgotLoading) e.currentTarget.style.backgroundColor = BRAND.primaryHover; }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
                >
                  {forgotLoading ? "Sending OTP…" : "Send OTP"}
                </button>

                <button
                  type="button"
                  onClick={goBackToLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </form>
            </>
          )}

          {/* ── RESET VIEW ── */}
          {view === "reset" && (
            <>
              {/* OTP sent notice */}
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-[#FF692E]" />
                <div>
                  OTP sent to <strong>{phoneNumber}</strong> via SMS.
                  The code is valid for <strong>10 minutes</strong>.
                </div>
              </div>

              {resetError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-5">
                {/* OTP */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    OTP Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg tracking-widest text-center font-mono text-lg"
                    style={{ outline: "none" }}
                    {...inputFocus}
                  />
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className={`w-full px-4 py-3 pr-12 border rounded-lg ${newTooShort ? "border-red-400" : "border-gray-300"}`}
                      style={{ outline: "none" }}
                      {...inputFocus}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {newTooShort && (
                    <p className="text-xs text-red-600 mt-1.5">Password must be at least 8 characters.</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      className={`w-full px-4 py-3 pr-12 border rounded-lg ${confirmMismatch ? "border-red-400" : "border-gray-300"}`}
                      style={{ outline: "none" }}
                      {...inputFocus}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 rounded transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmMismatch && (
                    <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={resetLoading || otp.length < 6 || newTooShort || confirmMismatch || !newPassword || !confirmPassword}
                  className="w-full px-4 py-3 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND.primary }}
                  onMouseEnter={(e) => { if (!resetLoading) e.currentTarget.style.backgroundColor = BRAND.primaryHover; }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
                >
                  {resetLoading ? "Resetting…" : "Reset Password"}
                </button>

                {/* Resend + Back */}
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-medium hover:underline disabled:opacity-50"
                    style={{ color: BRAND.primary }}
                  >
                    {resending ? "Sending…" : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Change number
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── SUCCESS VIEW ── */}
          {view === "success" && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm">
                  Your password has been reset successfully. Sign in with your new password to continue.
                </p>
              </div>
              <button
                type="button"
                onClick={goBackToLogin}
                className="w-full px-4 py-3 text-white font-semibold rounded-lg transition-colors shadow-sm"
                style={{ backgroundColor: BRAND.primary }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND.primaryHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND.primary)}
              >
                Back to Sign In
              </button>
            </div>
          )}

        </div>

        {/* Sign Up Link — only on login view */}
        {view === "login" && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{" "}
            <a
              href="https://m.me/gabysoftwareph"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: BRAND.primary }}
            >
              Sign up here
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
