import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const settingsItems = [
  { icon: "person", label: "Meu Perfil", action: "profile" },
  { icon: "credit_card", label: "Assinatura", action: "subscription" },
  { icon: "notifications", label: "Notificações", action: "notifications" },
  { icon: "shield", label: "Privacidade", action: "privacy" },
  { icon: "help", label: "Ajuda & Suporte", action: "help" },
  { icon: "info", label: "Sobre", action: "about" },
];

const Settings = () => {
  const navigate = useNavigate();

  const handleItemClick = (action: string) => {
    toast.info(`Abrindo ${action}...`);
  };

  const handleLogout = () => {
    toast.success("Logout realizado!");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-6">
          Ajustes
        </h2>

        {/* User Card */}
        <div className="bg-card rounded-xl p-4 border border-border mb-6 flex items-center gap-4">
          <div className="size-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground">
            <Icon name="person" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Ricardo Silva</h3>
            <p className="text-sm text-muted-foreground">ricardo@email.com</p>
          </div>
          <button className="text-primary">
            <Icon name="edit" size={20} />
          </button>
        </div>

        {/* Settings List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {settingsItems.map((item, index) => (
            <button
              key={item.action}
              onClick={() => handleItemClick(item.action)}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors ${
                index !== settingsItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <Icon name={item.icon} className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Icon name="logout" size={20} />
          <span className="font-medium">Sair da conta</span>
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Hot Class v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
