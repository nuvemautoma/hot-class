import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface UserPlan {
  plan_type: string;
  status: string;
  expires_at: string | null;
}

export const AccountStatusCard = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_plans")
        .select("plan_type, status, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPlan(data);
        
        // Calculate days remaining if there's an expiration date
        if (data.expires_at) {
          const expirationDate = new Date(data.expires_at);
          const now = new Date();
          const diffTime = expirationDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays);
        }
      }
      
      setLoading(false);
    };

    fetchPlan();
  }, [user]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-lg animate-pulse">
        <div className="p-5 h-32" />
      </div>
    );
  }

  // Default to vitalício if no plan found (legacy users)
  const planType = plan?.plan_type || 'vitalicio';
  const isActive = plan?.status === 'active' || !plan;
  const isLifetime = planType === 'vitalicio';
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  // Determine card styling based on status
  const getCardStyles = () => {
    if (isExpired) {
      return {
        glowClass: "bg-destructive/20",
        statusIcon: "error",
        statusColor: "text-destructive",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
      };
    }
    if (isExpiringSoon) {
      return {
        glowClass: "bg-warning/20",
        statusIcon: "warning",
        statusColor: "text-warning",
        badgeClass: "bg-warning/10 text-warning border-warning/20",
      };
    }
    return {
      glowClass: "bg-primary/10",
      statusIcon: "verified_user",
      statusColor: "text-primary/80",
      badgeClass: "bg-surface text-primary border-primary/20",
    };
  };

  const styles = getCardStyles();

  // Get plan display name
  const getPlanDisplayName = () => {
    switch (planType) {
      case 'mensal':
        return 'Plano Mensal';
      case 'trimestral':
        return 'Plano Trimestral';
      case 'vitalicio':
        return 'Acesso Vitalício';
      default:
        return 'Plano Ativo';
    }
  };

  // Get expiration display text
  const getExpirationText = () => {
    if (isLifetime) {
      return 'Sem data de expiração';
    }
    if (isExpired) {
      return 'Plano expirado';
    }
    if (daysRemaining !== null) {
      if (daysRemaining === 1) {
        return 'Expira amanhã';
      }
      return `Expira em ${daysRemaining} dias`;
    }
    return 'Data não disponível';
  };

  // Get badge text
  const getBadgeText = () => {
    if (isExpired) return 'Expirado';
    if (isExpiringSoon) return 'Expira em breve';
    switch (planType) {
      case 'mensal':
        return 'Mensal';
      case 'trimestral':
        return 'Trimestral';
      case 'vitalicio':
        return 'Vitalício';
      default:
        return 'Ativo';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-lg group">
      {/* Decorative background glow */}
      <div className={`absolute -right-10 -top-10 h-40 w-40 ${styles.glowClass} blur-[50px] rounded-full`} />

      <div className="relative p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Status da Conta
            </span>
            <div className="flex items-center gap-2 mt-1">
              {isActive && !isExpired && (
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isExpiringSoon ? 'bg-warning' : 'bg-success'} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isExpiringSoon ? 'bg-warning' : 'bg-success'}`} />
                </span>
              )}
              <span className="text-lg font-bold text-foreground">
                {getPlanDisplayName()}
              </span>
            </div>
          </div>
          <Icon name={styles.statusIcon} className={styles.statusColor} size={32} />
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLifetime ? (
              <Icon name="all_inclusive" className="text-success" size={20} />
            ) : isExpired ? (
              <Icon name="schedule" className="text-destructive" size={20} />
            ) : isExpiringSoon ? (
              <Icon name="schedule" className="text-warning" size={20} />
            ) : (
              <Icon name="schedule" className="text-muted-foreground" size={20} />
            )}
            <p className={`text-base font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : 'text-foreground'}`}>
              {isLifetime ? 'Plano vitalício – acesso eterno' : getExpirationText()}
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-xs font-medium border ${styles.badgeClass}`}>
            {getBadgeText()}
          </div>
        </div>

        {/* Warning message for expiring soon */}
        {isExpiringSoon && !isExpired && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <Icon name="warning" className="text-warning" size={18} />
            <p className="text-sm text-warning font-medium">
              Seu plano expira em breve. Renove para continuar com acesso.
            </p>
          </div>
        )}

        {/* Expired message */}
        {isExpired && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <Icon name="error" className="text-destructive" size={18} />
            <p className="text-sm text-destructive font-medium">
              Seu plano expirou. Renove para restaurar o acesso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
