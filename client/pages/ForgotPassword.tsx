// client/pages/ForgotPassword.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { authApi } from "@/services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  // ─── Step 1: Request reset code ─────────────────────────────────────────────
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Email is required"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Invalid email format"); return; }

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccessMsg("Reset code sent! Check your email (or server console in dev).");
      setStep("verify");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verify code ─────────────────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (resetCode.length !== 6) { setError("Enter the 6-digit code"); return; }

    setLoading(true);
    try {
      await authApi.verifyResetCode(email, resetCode);
      setStep("reset");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 3: Reset password ──────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(email, resetCode, newPassword);
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => { window.location.href = "/login"; }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccessMsg("New code sent!");
      setError("");
    } catch {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Security Badge */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Reset</span>
      </div>

      <Link
        to="/login"
        className={`absolute top-4 left-4 flex items-center gap-2 text-purple-600 hover:text-blue-900 transition-all duration-300 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
        style={{ zIndex: 100000 }}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Login</span>
      </Link>

      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className={`relative z-10 w-full max-w-md px-4 transition-all duration-1000 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-slow">
            {step === "request" && "Forgot Password"}
            {step === "verify" && "Verify Code"}
            {step === "reset" && "Reset Password"}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === "request" && "Enter your email to receive a reset code"}
            {step === "verify" && `Enter the 6-digit code sent to ${email}`}
            {step === "reset" && "Create a new password for your account"}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-700 hover:shadow-2xl">

          {/* Shared alerts */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Step 1 */}
          {step === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="account@gmail.com"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : "Send Reset Code"}
              </button>
              <p className="text-center text-sm text-gray-500">
                Remember your password?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* Step 2 */}
          {step === "verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Verification Code</label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || resetCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : "Verify Code"}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 transition-all duration-300"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Step 3 */}
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 mt-1"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>
                <div className="group">
                  <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 mt-1"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </div>
                ) : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 VISIATTEND. All rights reserved. | Secure Reset
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes slideUpAndShrink {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          50% { opacity: 0.8; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-slide-up-and-shrink { animation: slideUpAndShrink 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 3s infinite; }
      `}</style>
    </div>
  );
}
