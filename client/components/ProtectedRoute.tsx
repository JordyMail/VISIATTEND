// components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSession, refreshAccessToken } from "@/lib/auth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const session = getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        return;
      }

      // Check if token is expired (simulasi)
      const tokenExpired = false; // Dalam production, cek JWT expiry
      
      if (tokenExpired) {
        // Try to refresh token
        const newAccessToken = await refreshAccessToken(session.refreshToken);
        
        if (newAccessToken) {
          // Update session with new token
          const updatedSession = {
            ...session,
            accessToken: newAccessToken
          };
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();

    // Session timeout checker
    const interval = setInterval(() => {
      const session = getSession();
      if (!session) {
        setIsAuthenticated(false);
      }
    }, 60000); // Check every minute

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