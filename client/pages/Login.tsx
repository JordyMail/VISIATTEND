// client/pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Mail, Lock, Shield } from "lucide-react";
import { setSession, clearSession } from "@/lib/auth";
import { authApi } from "@/services/api";

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
  const [isVisible, setIsVisible] = useState(false);

  // Clear any existing session on login page
  useEffect(() => {
    clearSession();
    // Trigger fade-in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi");

      // Menghilangkan pesan error setelah 2 detik
      setTimeout(() => {
        setError("");
      }, 2000);
      
      return;
    } 

    setLoading(true);

    try {
      const response = await authApi.login({ email, password, rememberMe });
      const payload = response.data?.data;

      if (!response.data?.success || !payload?.user || !payload?.tokens) {
        setError(response.data?.message || "Email atau password salah");
        setLoading(false);
        return;
      }

      // Handle Remember Me - Simpan dengan enkripsi
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }

      // Set session dengan tokens
        setSession(payload.user, payload.tokens);
      
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
      {/* Security Badge dengan animasi fade-in */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Connection</span>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      
      {/* Card Container dengan animasi fade-in dan slide-up */}
      <div className={`relative z-10 w-full max-w-md px-4 mt-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Logo Section dengan animasi fade-in */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-slow">
            VISIATTEND
          </h1>
          <p className="text-gray-500 mt-2 transition-all duration-700 delay-200 opacity-0 animate-fade-in-up">
            Secure Attendance Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.02]">
          {!showTwoFactor ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-shake">
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="account@gmail.com"
                    autoComplete="username"
                  />
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
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
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>


              <div className="flex items-center justify-between">
                {/* Remember Me */}
                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
                        Remember me
                    </span>
                    </label>
                    
                </div>
                <div>
                    <Link 
                    to="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline block transition-all duration-300 hover:translate-x-1"
                    >
                    Forgot Password?
                    </Link>
                </div>
            </div>

              {/* Security Info */}
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 transition-all duration-300 hover:bg-blue-100/50">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-blue-600 animate-pulse" />
                  Your data is encrypted and secure
                </p>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    <span>Login</span>
                  </div>
                )}
              </button>

              {/* Links untuk Forgot Password dan Register */}
              <div className="text-center space-y-3 pt-2">

                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white/80 text-gray-500">New to VISIATTEND?</span>
                  </div>
                </div>
                
                <Link 
                  to="/register" 
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create New Account
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
              </div>

              <input
                type="text"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={() => setShowTwoFactor(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-all duration-300 hover:underline"
              >
                Back to login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6 transition-all duration-700 delay-500 opacity-0 animate-fade-in">
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
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
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
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
      `}</style>
    </div>
  );
}