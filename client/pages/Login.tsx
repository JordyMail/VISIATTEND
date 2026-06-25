import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, Mail, Lock, Shield } from "lucide-react";
import { setSession, clearSession, getSessionUser } from "@/lib/auth";
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

  useEffect(() => {
    clearSession();
    setTimeout(() => setIsVisible(true), 100);

    const remembered = localStorage.getItem("rememberedEmail");
    const rememberFlag = localStorage.getItem("rememberMe");
    if (remembered && rememberFlag === "true") {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan password wajib diisi");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      const { data } = response.data;

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberMe");
      }

      setSession(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      const { role } = data.user;
      if (role === "super_admin") {
        navigate("/superadmin/dashboard");
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else if (role === "attendance") {
        navigate("/attendance/home");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Email atau password salah";
      setError(msg);
      setTimeout(() => setError(""), 4000);
    } finally {
      setLoading(false);
    }
  };


  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (twoFactorCode === "123456") {
        const user = getSessionUser();
        if (user) {
          const { role } = user;
          if (role === "super_admin") {
            navigate("/superadmin/dashboard");
          } else if (role === "admin") {
            navigate("/admin/dashboard");
          } else if (role === "attendance") {
            navigate("/attendance/home");
          } else {
            navigate("/user/dashboard");
          }
        } else {
          navigate("/login");
        }
      } else {
        setError("Kode 2FA salah");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Connection</span>
      </div>

      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className={`relative z-10 w-full max-w-md px-4 mt-12 transition-all duration-1000 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-slow">
            VISIATTEND
          </h1>
          <p className="text-gray-500 mt-2 animate-fade-in-up">
            Secure Attendance Management System
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.02]">
          {!showTwoFactor ? (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-shake">
                  <div className="w-1 h-8 bg-red-500 rounded-full mr-3" />
                  {error}
                </div>
              )}

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
                    disabled={loading}
                  />
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                </div>
              </div>

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
                    placeholder="********"
                    autoComplete="current-password"
                    disabled={loading}
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
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 cursor-pointer"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 hover:translate-x-1"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-600 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-blue-600 animate-pulse" />
                  Your data is encrypted and secure
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
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
            </form>
          ) : (
            <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <input
                type="text"
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
      </div>
    </div>
  );
}
