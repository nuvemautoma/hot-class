import { ReactNode, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading, ipBlocked, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !isOwner && !isAdmin) {
      toast.error("Acesso negado");
      navigate("/", { replace: true });
    }
  }, [loading, user, isOwner, isAdmin, navigate]);

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

  if (ipBlocked) {
    return <Navigate to="/login?blocked=true" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isOwner && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
