// client/components/guards/RouteGuard.tsx
import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

/**
 * Wraps a route: redirects to /login if not authenticated,
 * redirects to /unauthorized if role doesn't match.
 */
export function RouteGuard({ children, requiredRoles }: Props) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && !requiredRoles.includes(session.user.role as AppRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}