// client/pages/NotFound.tsx
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-primary/20 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-gray-500 mb-8">Halaman yang kamu cari tidak ada atau telah dipindahkan.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" /> Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
