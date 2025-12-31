import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  title: string;
  message: string;
  target_user_id: string | null;
  created_at: string;
  read: boolean;
}

const Alerts = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    // Fetch notifications: either for all users (target_user_id is null) or specifically for this user
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.is.null,target_user_id.eq.${user?.id}`)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Alertas
          </h2>
          {notifications.length > 0 && (
            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {notifications.length} NOVOS
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col gap-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 rounded-xl border transition-all bg-card border-border hover:border-primary/30"
              >
                <div className="flex gap-3">
                  <div className="size-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <Icon name="notifications" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-2">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Icon name="notifications_active" size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">Você não tem notificações no momento</p>
              <p className="text-xs mt-1 opacity-60">Novas notificações aparecerão aqui</p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Alerts;