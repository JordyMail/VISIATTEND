// client/pages/Register.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, Phone, Shield, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { encryptData } from "@/lib/auth";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    memberId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    minLength: false,
  });

  useEffect(() => {
    // Trigger fade-in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      score: 
        (password.length >= 8 ? 1 : 0) +
        (/[a-z]/.test(password) ? 1 : 0) +
        (/[A-Z]/.test(password) ? 1 : 0) +
        (/[0-9]/.test(password) ? 1 : 0) +
        (/[^A-Za-z0-9]/.test(password) ? 1 : 0),
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
      minLength: password.length >= 8,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Invalid email format");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (passwordStrength.score < 3) {
      setError("Password is too weak. Please use a stronger password.");
      return false;
    }

    if (!formData.phoneNumber) {
      setError("Phone number is required");
      return false;
    }

    const phoneRegex = /^[0-9]{10,13}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\D/g, ''))) {
      setError("Invalid phone number format");
      return false;
    }

    if (!agreeTerms) {
      setError("You must agree to the terms and conditions");
      return false;
    }

    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Simulasi API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Cek apakah email sudah terdaftar (simulasi)
      if (formData.email === "admin@gmail.com") {
        setError("Email already registered");
        setLoading(false);
        return;
      }

      // Enkripsi data sensitif sebelum disimpan (simulasi)
      const encryptedData = {
        ...formData,
        password: encryptData(formData.password),
        createdAt: new Date().toISOString(),
      };

      // Simpan ke localStorage (simulasi, seharusnya ke backend)
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      users.push({
        id: users.length + 1,
        ...encryptedData,
        password: formData.password, // Simpan password asli untuk demo (jangan lakukan di production!)
        role: 'member',
        isActive: true,
        emailVerified: false,
      });
      localStorage.setItem('users', JSON.stringify(users));

      setSuccess("Registration successful! Please check your email to verify your account.");

      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please login with your credentials.' 
          } 
        });
      }, 3000);

    } catch (error) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    const score = passwordStrength.score;
    if (score <= 2) return 'bg-red-500';
    if (score === 3) return 'bg-yellow-500';
    if (score >= 4) return 'bg-green-500';
    return 'bg-gray-200';
  };

  const getPasswordStrengthText = () => {
    const score = passwordStrength.score;
    if (score <= 2) return 'Weak';
    if (score === 3) return 'Medium';
    if (score >= 4) return 'Strong';
    return '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden py-8">
      {/* Security Badge dengan animasi fade-in */}
      <div className={`absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-gray-200 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <Shield className="w-4 h-4 text-green-600" />
        <span className="text-xs text-gray-600">Secure Registration</span>
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
      <div className={`relative z-10 w-full max-w-2xl px-4 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header dengan animasi fade-in bertahap */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-slow">
            Create Account
          </h1>
          <p className={`text-gray-500 mt-2 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Join VISIATTEND to manage attendance efficiently
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 md:p-8 transition-all duration-700 hover:shadow-2xl hover:scale-[1.01]">
          {success ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Registration Successful!</h3>
              <p className="text-gray-600 mb-4">{success}</p>
              <p className="text-sm text-gray-500">Redirecting to login page...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center animate-shake">
                  <div className="w-1 h-8 bg-red-500 rounded-full mr-3" />
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <User className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <Mail className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="john@example.com"
                />
              </div>

              {/* Member ID (Optional) */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <User className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Member ID (Optional)
                </label>
                <input
                  type="text"
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="MEM001"
                />
              </div>

              {/* Password */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <Lock className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 pr-10 hover:border-blue-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-2 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getPasswordStrengthColor()} transition-all duration-700 ease-out`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                        {passwordStrength.minLength ? 
                          <CheckCircle className="w-3 h-3 text-green-500 animate-scale-in" /> : 
                          <XCircle className="w-3 h-3 text-gray-300" />
                        }
                        <span className={passwordStrength.minLength ? 'text-green-600' : 'text-gray-400'}>
                          Min 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                        {passwordStrength.hasLower ? 
                          <CheckCircle className="w-3 h-3 text-green-500 animate-scale-in" /> : 
                          <XCircle className="w-3 h-3 text-gray-300" />
                        }
                        <span className={passwordStrength.hasLower ? 'text-green-600' : 'text-gray-400'}>
                          Lowercase
                        </span>
                      </div>
                      <div className="flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                        {passwordStrength.hasUpper ? 
                          <CheckCircle className="w-3 h-3 text-green-500 animate-scale-in" /> : 
                          <XCircle className="w-3 h-3 text-gray-300" />
                        }
                        <span className={passwordStrength.hasUpper ? 'text-green-600' : 'text-gray-400'}>
                          Uppercase
                        </span>
                      </div>
                      <div className="flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                        {passwordStrength.hasNumber ? 
                          <CheckCircle className="w-3 h-3 text-green-500 animate-scale-in" /> : 
                          <XCircle className="w-3 h-3 text-gray-300" />
                        }
                        <span className={passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-400'}>
                          Number
                        </span>
                      </div>
                      <div className="flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                        {passwordStrength.hasSpecial ? 
                          <CheckCircle className="w-3 h-3 text-green-500 animate-scale-in" /> : 
                          <XCircle className="w-3 h-3 text-gray-300" />
                        }
                        <span className={passwordStrength.hasSpecial ? 'text-green-600' : 'text-gray-400'}>
                          Special character
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <Lock className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 pr-10 hover:border-blue-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1 animate-shake">Passwords do not match</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1 group">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors duration-300 group-hover:text-blue-600">
                  <Phone className="w-4 h-4 text-gray-400 transition-colors duration-300 group-hover:text-blue-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/50 hover:border-blue-300"
                  placeholder="081234567890"
                />
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3 group">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all duration-300 cursor-pointer hover:scale-110"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <button type="button" className="text-blue-600 hover:underline transition-all duration-300 hover:translate-x-1">
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button type="button" className="text-blue-600 hover:underline transition-all duration-300 hover:translate-x-1">
                    Privacy Policy
                  </button>
                </label>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Login Link */}
              <p className="text-center text-sm text-gray-500 transition-all duration-300 hover:scale-105">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium transition-all duration-300 hover:text-blue-800">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
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
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
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
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
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