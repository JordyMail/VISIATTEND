// pages/ForgotPassword.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Shield, CheckCircle, AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simulasi API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Validasi email
      if (!email) {
        setError("Email is required");
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Invalid email format");
        setLoading(false);
        return;
      }

      // Cek apakah email terdaftar (simulasi)
      if (email !== "admin@gmail.com") {
        setError("Email not found in our system");
        setLoading(false);
        return;
      }

      // Generate reset code (simulasi)
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`Reset code for ${email}: ${code}`); // In production, kirim via email
      
      // Simpan code di localStorage untuk demo
      localStorage.setItem('resetCode', code);
      localStorage.setItem('resetEmail', email);

      setSuccess(true);
      setStep("verify");
    } catch (error) {
      setError("Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const savedCode = localStorage.getItem('resetCode');
      
      if (resetCode !== savedCode) {
        setError("Invalid verification code");
        setLoading(false);
        return;
      }

      setStep("reset");
    } catch (error) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update password (simulasi)
      console.log("Password reset successful for:", email);
      
      // Cleanup
      localStorage.removeItem('resetCode');
      localStorage.removeItem('resetEmail');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login?reset=success';
      }, 2000);

    } catch (error) {
      setError("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem('resetCode', newCode);
      console.log(`New reset code: ${newCode}`);
      setError("");
      alert("New verification code has been sent to your email");
    } catch (error) {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Security Badge dengan animasi fade-in */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Reset</span>
      </div>

      {/* Back to Login dengan animasi fade-in */}
      <Link 
        to="/login" 
        className={`absolute top-4 left-4 flex items-center gap-2 text-purple-600 hover:text-blue-900 transition-all duration-300 hover:translate-x-1 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
        style={{ zIndex: 100000 }}
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="text-sm">Back to Login</span>
      </Link>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      
      {/* Card Container dengan animasi fade-in dan slide-up */}
      <div className={`relative z-10 w-full max-w-md px-4 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header dengan animasi fade-in bertahap */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-slow">
            {step === "request" && "Forgot Password"}
            {step === "verify" && "Verify Code"}
            {step === "reset" && "Reset Password"}
          </h1>
          <p className={`text-gray-500 mt-2 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {step === "request" && "Enter your email to receive a reset code"}
            {step === "verify" && "Enter the 6-digit code sent to your email"}
            {step === "reset" && "Create a new password for your account"}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01]">
          {step === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-6">
              {/* Error Alert dengan animasi slide up dan scale */}
              {error && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink"
                >
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 animate-pulse" />
                  {error}
                </div>
              )}

              {/* Success Alert dengan animasi slide up dan scale */}
              {success && (
                <div 
                  className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink"
                >
                  <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce-slow" />
                  Reset code sent! Check your email.
                </div>
              )}

              <div className="space-y-2 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <Mail className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Code'
                )}
              </button>

              <p className="text-center text-sm text-gray-500 transition-all duration-300 hover:scale-105">
                Remember your password?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium transition-all duration-300 hover:text-blue-800">
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              {/* Error Alert dengan animasi slide up dan scale */}
              {error && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink"
                >
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 transition-colors duration-300 hover:text-blue-600">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 text-center mt-2 animate-fade-in">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || resetCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 transition-all duration-300 hover:translate-x-1"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* Error Alert dengan animasi slide up dan scale */}
              {error && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-slide-up-and-shrink"
                >
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 animate-pulse" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="text-sm font-medium text-gray-700 transition-colors duration-300 group-hover:text-blue-600">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 mt-1 hover:border-blue-300"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1 animate-fade-in">
                    Minimum 8 characters
                  </p>
                </div>

                <div className="group">
                  <label className="text-sm font-medium text-gray-700 transition-colors duration-300 group-hover:text-blue-600">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 mt-1 hover:border-blue-300"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className={`text-center text-xs text-gray-400 mt-6 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          © 2026 VISIATTEND. All rights reserved. | Secure Reset
        </p>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUpAndShrink {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-2px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-slide-up-and-shrink {
          animation: slideUpAndShrink 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
      `}</style>
    </div>
  );
}