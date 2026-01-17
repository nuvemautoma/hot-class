import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";

const Disparador = () => {
  const [loading, setLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisparadorLink = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "disparador_link")
        .maybeSingle();

      if (!error && data) {
        setRedirectUrl(data.value);
      }
      setLoading(false);
    };

    fetchDisparadorLink();
  }, []);

  const handleRedirect = () => {
    if (redirectUrl) {
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto pb-24 px-4">
        <div className="pt-8 pb-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Ferramenta Premium
          </p>
          <h2 className="text-3xl font-bold text-foreground leading-tight">
            Disparador
          </h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
          {/* Icon container with glow effect */}
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative size-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Icon name="rocket_launch" size={48} className="text-primary" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Disparo em Massa
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Acesse nossa ferramenta exclusiva de disparos com motor anti-spam inteligente.
            </p>
          </div>

          {redirectUrl ? (
            <button
              onClick={handleRedirect}
              className="relative group w-full max-w-xs"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-300" />
              <div className="relative flex items-center justify-center gap-3 py-4 bg-primary text-primary-foreground font-black rounded-2xl shadow-[0_0_30px_rgba(0,255,0,0.3)] active:scale-[0.97] transition-all border border-primary/20 uppercase tracking-[2px]">
                <Icon name="rocket_launch" size={20} />
                Acessar Ferramenta
              </div>
            </button>
          ) : (
            <div className="text-center p-4 rounded-xl bg-card border border-border">
              <Icon name="info" size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Link não configurado. Entre em contato com o administrador.
              </p>
            </div>
          )}

          {/* Features */}
          <div className="w-full max-w-xs space-y-3 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="shield" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Anti-Spam IA</p>
                <p className="text-xs text-muted-foreground">Motor inteligente de proteção</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="speed" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Alta Performance</p>
                <p className="text-xs text-muted-foreground">Disparos otimizados</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="timer" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Intervalo Randômico</p>
                <p className="text-xs text-muted-foreground">Simula comportamento humano</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Disparador;
