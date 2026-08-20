// client/pages/Register.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye, EyeOff, User, Mail, Lock, Phone, Shield, ArrowLeft, CheckCircle, XCircle,
} from "lucide-react";
import { authApi } from "@/services/api";
import { useLanguage } from "@/lib/i18n";

const JABATAN_OPTIONS = [
  { value: "preacher", key: "rolePreacher" },
  { value: "ketua", key: "roleChair" },
  { value: "wakil_ketua", key: "roleViceChair" },
  { value: "kepala_divisi", key: "roleDivisionHead" },
  { value: "member_divisi", key: "roleDivisionMember" },
  { value: "peserta", key: "roleParticipant" },
] as const;

interface PasswordStrength {
  score: number; hasLower: boolean; hasUpper: boolean;
  hasNumber: boolean; hasSpecial: boolean; minLength: boolean;
}

export default function Register() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    phoneNumber: "", jabatan: "peserta",
  });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showCPw,   setShowCPw]   = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isVisible, setIsVisible]   = useState(false);
  const [pwStrength, setPwStrength] = useState<PasswordStrength>({
    score: 0, hasLower: false, hasUpper: false, hasNumber: false, hasSpecial: false, minLength: false,
  });

  useEffect(() => { setTimeout(() => setIsVisible(true), 100); }, []);

  const checkStrength = (pw: string) => {
    setPwStrength({
      score:      (pw.length >= 8 ? 1 : 0) + (/[a-z]/.test(pw) ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0),
      hasLower:   /[a-z]/.test(pw),
      hasUpper:   /[A-Z]/.test(pw),
      hasNumber:  /[0-9]/.test(pw),
      hasSpecial: /[^A-Za-z0-9]/.test(pw),
      minLength:  pw.length >= 8,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (name === "password") checkStrength(value);
  };

  const validate = () => {
    if (!formData.fullName.trim()) { setError(`${t("fullName")} ${t("required").toLowerCase()}`); return false; }
    if (!formData.email.trim())    { setError(`${t("emailAddress")} ${t("required").toLowerCase()}`); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError("Invalid email format"); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError(t("invalidEmail")); return false; }
    if (!formData.password)        { setError(`${t("password")} ${t("required").toLowerCase()}`); return false; }
    if (formData.password.length < 8) { setError(t("minCharacters")); return false; }
    if (formData.password !== formData.confirmPassword) { setError(t("passwordMismatch")); return false; }
    if (pwStrength.score < 3)      { setError(`${t("password")} is too weak`); return false; }
      if (pwStrength.score < 3)      { setError(`${t("password")} ${t("weak").toLowerCase()}`); return false; }
    if (!formData.phoneNumber)     { setError(`${t("phoneNumber")} ${t("required").toLowerCase()}`); return false; }
    if (!agreeTerms)               { setError(`${t("agreeTo")} ${t("termsAndConditions")}`); return false; }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.register({
        fullName:    formData.fullName,
        email:       formData.email,
        password:    formData.password,
        phoneNumber: formData.phoneNumber,
        jabatan:     formData.jabatan,
      });
      setSuccess(t("registrationSuccess"));
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registrasi gagal. Coba lagi.");
      setError(err.response?.data?.message || t("registrationFailed"));
    } finally { setLoading(false); }
  };

  const strengthColor = () => {
    if (pwStrength.score <= 2) return "bg-red-500";
    if (pwStrength.score === 3) return "bg-yellow-500";
    return "bg-green-500";
  };
  const strengthText = () => {
    if (pwStrength.score <= 2) return t("weak");
    if (pwStrength.score === 3) return t("medium");
    return t("strong");
  };

  const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-1 transition-all duration-300">
      {ok ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-300" />}
      <span className={ok ? "text-green-600" : "text-gray-400"}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden py-8">
      {/* Security badge */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">{t("secureRegistration")}</span>
      </div>

      <Link to="/login" className={`absolute top-4 left-4 flex items-center gap-2 text-purple-600 hover:text-blue-900 transition-all duration-300 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm z-10 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">{t("backToLogin")}</span>
      </Link>

      {/* Blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      <div className={`relative z-10 w-full max-w-2xl px-4 transition-all duration-1000 transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            VISIATTEND
          </h1>
          <p className="text-gray-500 mt-1">{t("createAccountPrompt")}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 md:p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("success")}</h3>
              <p className="text-gray-600">{success}</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
                  <div className="w-1 h-8 bg-red-500 rounded-full mr-3 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama */}
                <div className="md:col-span-2 space-y-1 group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                    <User className="w-4 h-4 text-gray-400" /> {t("fullName")} *
                  </label>
                  <input name="fullName" type="text" value={formData.fullName} onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                    placeholder={t("fullNamePlaceholder")} disabled={loading} />
                </div>

                {/* Email */}
                <div className="space-y-1 group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400" /> Email *
                  </label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                    placeholder="email@domain.com" disabled={loading} />
                </div>

                {/* HP */}
                <div className="space-y-1 group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" /> {t("phoneNumber")} *
                  </label>
                  <input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                    placeholder="08xxxxxxxxxx" disabled={loading} />
                </div>

                {/* Jabatan */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t("organizationRole")}</label>
                  <select name="jabatan" value={formData.jabatan} onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                    disabled={loading}>
                    {JABATAN_OPTIONS.map((j) => <option key={j.value} value={j.value}>{t(j.key)}</option>)}
                  </select>
                </div>

                {/* Password */}
                <div className="space-y-1 group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                    <Lock className="w-4 h-4 text-gray-400" /> Password *
                  </label>
                  <div className="relative">
                    <input name="password" type={showPw ? "text" : "password"} value={formData.password} onChange={handleChange}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                      placeholder="••••••••" disabled={loading} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${strengthColor()} transition-all duration-500`}
                            style={{ width: `${(pwStrength.score / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{strengthText()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <CheckRow ok={pwStrength.minLength} label={t("minCharacters")} />
                        <CheckRow ok={pwStrength.hasLower}  label={t("lowercase")} />
                        <CheckRow ok={pwStrength.hasUpper}  label={t("uppercase")} />
                        <CheckRow ok={pwStrength.hasNumber} label={t("number")} />
                        <CheckRow ok={pwStrength.hasSpecial} label={t("specialCharacter")} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1 group">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                    <Lock className="w-4 h-4 text-gray-400" /> {t("confirmPassword")} *
                  </label>
                  <div className="relative">
                    <input name="confirmPassword" type={showCPw ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white/50 hover:border-blue-300"
                      placeholder="••••••••" disabled={loading} />
                    <button type="button" onClick={() => setShowCPw(!showCPw)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{t("passwordMismatch")}</p>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" disabled={loading} />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  {t("agreeTo")} {" "}
                  <span className="text-blue-600 cursor-pointer hover:underline">{t("termsAndConditions")}</span>
                  {" "}{t("and")}{" "}
                  <span className="text-blue-600 cursor-pointer hover:underline">{t("privacyPolicy")}</span>
                </label>
              </div>

              <button type="submit" disabled={loading || !agreeTerms}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t("loading")}</span>
                  </div>
                ) : t("registerNow")}
              </button>

              <p className="text-center text-sm text-gray-500">
                {t("alreadyHaveAccount")}{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">{t("signIn")}</Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2024 VISIATTEND. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px,0px) scale(1); }
          33% { transform: translate(30px,-50px) scale(1.1); }
          66% { transform: translate(-20px,20px) scale(0.9); }
          100% { transform: translate(0px,0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
