import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/hooks/useAuth";
import { usePlanValidation } from "@/hooks/usePlanValidation";

const Renewal = () => {
  const { signOut, profile } = useAuth();
  const { plan, getPlanLabel } = usePlanValidation();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-background">
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-destructive/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto px-6 relative z-10 flex flex-col gap-8">
        {/* Icon Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive to-destructive/50 flex items-center justify-center shadow-lg shadow-destructive/20">
            <Icon name="event_busy" className="text-destructive-foreground" size={40} />
          </div>
          <div className="text-center space-y-3">
            <h1 className="text-foreground tracking-tight text-3xl font-bold leading-tight">
              Plano Expirado
            </h1>
            <p className="text-muted-foreground text-base font-normal leading-normal">
              Seu acesso foi encerrado
            </p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Icon name="person" className="text-muted-foreground" size={20} />
            <div>
              <p className="text-xs text-muted-foreground">Conta</p>
              <p className="text-sm text-foreground font-medium">{profile?.email || "—"}</p>
            </div>
          </div>
          
          {plan && (
            <div className="flex items-center gap-3">
              <Icon name="credit_card" className="text-muted-foreground" size={20} />
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="text-sm text-foreground font-medium">{getPlanLabel(plan.plan_type)}</p>
              </div>
            </div>
          )}
          
          {plan?.expires_at && (
            <div className="flex items-center gap-3">
              <Icon name="schedule" className="text-muted-foreground" size={20} />
              <div>
                <p className="text-xs text-muted-foreground">Expirou em</p>
                <p className="text-sm text-destructive font-medium">
                  {new Date(plan.expires_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <a
            href="https://pay.cakto.com.br/ctz2hzj"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            <span>Renovar Plano</span>
            <Icon name="arrow_forward" size={20} className="transition-transform group-hover:translate-x-1" />
          </a>
          
          <button
            onClick={handleLogout}
            className="w-full h-12 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-base rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Icon name="logout" size={20} />
            <span>Sair</span>
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Dúvidas? Entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Renewal;
