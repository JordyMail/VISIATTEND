// client/pages/Unauthorized.tsx
import { ShieldOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/lib/auth";

export default function Unauthorized() {
  const navigate = useNavigate();
  const session  = getSession();

  const goHome = () => {
    if (!session) { navigate("/login"); return; }
    const role = session.user.role;
    if (role === "super_admin") navigate("/superadmin/dashboard");
    else if (role === "admin")  navigate("/admin/dashboard");
    else                        navigate("/user/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-gray-500 mb-8">
          Kamu tidak memiliki izin untuk mengakses halaman ini.
          Hubungi super admin jika kamu merasa ini adalah kesalahan.
        </p>
        <Button onClick={goHome} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}