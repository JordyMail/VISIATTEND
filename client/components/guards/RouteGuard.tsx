// client/components/guards/RouteGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function RouteGuard({ children, requiredRoles }: Props) {
  const location = useLocation();
  const session = getSession();

  // Not authenticated → redirect to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role → redirect to their home
  if (requiredRoles && !requiredRoles.includes(session.user.role as AppRole)) {
    const role = session.user.role;
    if (role === "super_admin") return <Navigate to="/superadmin/dashboard" replace />;
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/user/dashboard" replace />;
  }

  return <>{children}</>;
}