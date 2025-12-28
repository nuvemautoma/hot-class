import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { LifetimeStatusCard } from "@/components/dashboard/LifetimeStatusCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Icon } from "@/components/ui/Icon";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto pb-24">
        {/* Greeting Section */}
        <div className="px-5 pt-8 pb-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Bem-vindo de volta,</p>
          <h2 className="text-3xl font-bold text-foreground leading-tight">Ricardo Silva</h2>
        </div>

        {/* Status Card */}
        <div className="px-4 mb-6">
          <LifetimeStatusCard />
        </div>

        {/* Quick Stats */}
        <div className="px-4 mb-8">
          <div className="flex gap-3">
            <StatCard icon="groups" value={12} label="Grupos Acessados" variant="primary" />
            <StatCard icon="all_inclusive" value="∞" label="Acesso Vitalício" variant="success" />
          </div>
        </div>

        {/* Recent Activity Header */}
        <div className="px-5 mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Acesso Rápido</h3>
        </div>

        {/* Large CTA Button Area */}
        <div className="px-4 mt-auto mb-4">
          <div className="relative group/btn">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-pink-600 rounded-xl blur opacity-30 group-hover/btn:opacity-60 transition duration-200" />
            <button
              onClick={() => navigate("/grupos")}
              className="relative w-full flex items-center justify-between bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-14 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98]"
            >
              <span className="flex flex-col items-start">
                <span className="text-base leading-none">Ver Grupos Disponíveis</span>
                <span className="text-[10px] font-normal opacity-80 mt-1">
                  Clique para navegar no catálogo
                </span>
              </span>
              <div className="bg-primary-foreground/20 rounded-full p-1">
                <Icon name="arrow_forward" size={20} />
              </div>
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-3">
            Acesso seguro e criptografado de ponta a ponta.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
