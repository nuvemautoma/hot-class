import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";

const alerts = [
  {
    id: 1,
    title: "Novo grupo disponível",
    description: "O grupo 'Mastermind Elite' foi liberado para você.",
    time: "2h atrás",
    icon: "group_add",
    read: false,
  },
  {
    id: 2,
    title: "Renovação próxima",
    description: "Sua assinatura será renovada em 5 dias.",
    time: "1d atrás",
    icon: "event",
    read: false,
  },
  {
    id: 3,
    title: "Bem-vindo ao Hot Class!",
    description: "Sua conta foi criada com sucesso.",
    time: "3d atrás",
    icon: "celebration",
    read: true,
  },
];

const Alerts = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Alertas
          </h2>
          <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            Marcar todos como lidos
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.read
                  ? "bg-card border-border"
                  : "bg-card border-primary/30 shadow-sm"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                    alert.read ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon name={alert.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground">{alert.title}</h4>
                    {!alert.read && (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">{alert.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;
