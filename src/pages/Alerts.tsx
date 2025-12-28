import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";

const Alerts = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Alertas
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {/* Welcome Alert */}
          <div className="p-4 rounded-xl border transition-all bg-card border-border">
            <div className="flex gap-3">
              <div className="size-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <Icon name="celebration" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">Bem-vindo ao Hot Class!</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sua conta foi criada com sucesso. Aproveite seu acesso vitalício!
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">Agora</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state hint */}
        <div className="flex-1 flex items-center justify-center mt-8">
          <div className="text-center text-muted-foreground">
            <Icon name="notifications_active" size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Você verá novas notificações aqui</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;
