// pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Mail, Lock, Shield } from "lucide-react";
import { encryptData, setSecureCookie, setSession, clearSession } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  // Clear any existing session on login page
  useEffect(() => {
    clearSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }

    setLoading(true);

    try {
      // Simulasi API call ke backend
      // Dalam production, ini akan memanggil endpoint login yang mengembalikan tokens
      const response = await new Promise<{ success: boolean; twoFactorRequired?: boolean; data?: any }>((resolve) => {
        setTimeout(() => {
          if (email === "admin@gmail.com" && password === "123") {
            resolve({
              success: true,
              twoFactorRequired: false,
              data: {
                user: {
                  id: 1,
                  email: "admin@gmail.com",
                  name: "Admin User",
                  role: "admin"
                },
                tokens: {
                  accessToken: "dummy-access-token-" + Date.now(),
                  refreshToken: "dummy-refresh-token-" + Date.now()
                }
              }
            });
          } else {
            resolve({ success: false });
          }
        }, 1000);
      });

      if (!response.success) {
        setError("Email atau password salah");
        setLoading(false);
        return;
      }

      if (response.twoFactorRequired) {
        setShowTwoFactor(true);
        setLoading(false);
        return;
      }

      // Handle Remember Me - Simpan dengan enkripsi
      if (rememberMe) {
        const encryptedEmail = encryptData(email);
        localStorage.setItem("rememberedEmail", encryptedEmail);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }

      // Set session dengan tokens
      setSession(response.data.user, response.data.tokens);
      
      // Set activity tracker
      window.addEventListener('mousemove', updateActivity);
      window.addEventListener('keypress', updateActivity);
      
      navigate("/");
    } catch (error) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const updateActivity = () => {
    // Update last activity di session
    const sessionStr = localStorage.getItem('session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      session.lastActivity = Date.now();
      localStorage.setItem('session', JSON.stringify(session));
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Verifikasi 2FA code
      // Simulasi verifikasi
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (twoFactorCode === "123456") {
        // Login success dengan 2FA
        const response = {
          user: {
            id: 1,
            email: "admin@gmail.com",
            name: "Admin User",
            role: "admin"
          },
          tokens: {
            accessToken: "dummy-access-token-" + Date.now(),
            refreshToken: "dummy-refresh-token-" + Date.now()
          }
        };
        
        setSession(response.user, response.tokens);
        navigate("/");
      } else {
        setError("Kode 2FA salah");
      }
    } catch (error) {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Security Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200">
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Connection</span>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      
      {/* Card Container */}
      <div className="relative z-10 w-full max-w-md px-4 mt-12">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            VISIATTEND
          </h1>
          <p className="text-gray-500 mt-2">Secure Attendance Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
          {!showTwoFactor ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
                  <div className="w-1 h-8 bg-red-500 rounded-full mr-3" />
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="account@gmail.com"
                    autoComplete="username"
                  />
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    Remember me
                  </span>
                </label>
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-all duration-200"
                >
                  Forgot password?
                </button>
              </div>

              {/* Security Info */}
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-blue-600" />
                  Your data is encrypted and secure
                </p>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span>Login</span>
                  </div>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
              </div>

              <input
                type="text"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={() => setShowTwoFactor(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Back to login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 VISIATTEND. All rights reserved. | Secure Login v2.0
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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}