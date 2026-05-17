// client/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSession, clearSession, refreshAccessToken } from "@/lib/auth";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const session = getSession();

      if (!session) {
        setIsAuthenticated(false);
        return;
      }

      // Check if access token is expiring soon (within 5 minutes)
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() > session.expiresAt - fiveMinutes && session.refreshToken) {
        const newToken = await refreshAccessToken(session.refreshToken);
        if (!newToken) {
          clearSession();
          setIsAuthenticated(false);
          return;
        }
      }

      setIsAuthenticated(true);
    };

    checkAuth();

    // Periodic session check
    const interval = setInterval(() => {
      const session = getSession();
      if (!session) setIsAuthenticated(false);
    }, 60_000);

    return () => clearInterval(interval);
  }, [location]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}