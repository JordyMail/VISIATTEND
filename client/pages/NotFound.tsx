// client/pages/NotFound.tsx
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getSession } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleGoHome = () => {
    const session = getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    const { role } = session.user;
    if (role === "super_admin") {
      navigate("/superadmin/dashboard");
    } else if (role === "admin") {
      navigate("/admin/dashboard");
    } else if (role === "attendance") {
      navigate("/attendance/home");
    } else {
      navigate("/user/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-primary/20 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("pageNotFound")}</h1>
        <p className="text-gray-500 mb-8">{t("pageMoved")}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("back")}
          </Button>
          <Button onClick={handleGoHome} className="gap-2">
            <Home className="w-4 h-4" /> {t("home")}
          </Button>
        </div>
      </div>
    </div>
  );
}
