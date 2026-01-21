import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanValidation } from "@/hooks/usePlanValidation";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading, isOwner, isAdmin } = useAuth();
  const { loading: planLoading, isValid, isExpired } = usePlanValidation();

  const loading = authLoading || planLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Owner and admins bypass plan validation
  if (isOwner || isAdmin) {
    return <>{children}</>;
  }

  // Check if user has valid plan
  if (!isValid) {
    if (isExpired) {
      return <Navigate to="/renovar" replace />;
    }
    // No plan at all - redirect to renewal page
    return <Navigate to="/renovar" replace />;
  }

  return <>{children}</>;
};
