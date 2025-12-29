import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  isAdmin: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isOwner, isAdmin, profile, loading } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Redirect if not authorized
  useEffect(() => {
    if (!loading && !isOwner && !isAdmin) {
      toast.error("Acesso negado");
      navigate("/");
    }
  }, [loading, isOwner, isAdmin, navigate]);

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) {
      setIsLoading(false);
      return;
    }

    // Get all admin roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const usersWithRoles: UserWithRole[] = profiles.map(p => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      email: p.email,
      created_at: p.created_at,
      isAdmin: adminUserIds.has(p.user_id)
    }));

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOwner || isAdmin) {
      fetchUsers();
    }
  }, [isOwner, isAdmin]);

  // Toggle admin status (only owner can do this)
  const toggleAdmin = async (user: UserWithRole) => {
    if (!isOwner) {
      toast.error("Apenas o dono pode gerenciar admins");
      return;
    }

    // Cannot change owner status
    if (user.email === "hotclass@dono.com") {
      toast.error("O dono não pode ter seu status alterado");
      return;
    }

    if (user.isAdmin) {
      // Remove admin
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id)
        .eq("role", "admin");

      if (error) {
        toast.error("Erro ao remover admin");
        return;
      }

      toast.success(`${user.name} não é mais admin`);
    } else {
      // Add admin
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.user_id, role: "admin" });

      if (error) {
        toast.error("Erro ao adicionar admin");
        return;
      }

      toast.success(`${user.name} agora é admin`);
    }

    fetchUsers();
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || (!isOwner && !isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            Painel Admin
          </h2>
          <button
            onClick={() => navigate("/ajustes")}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Icon name="arrow_back" size={24} />
          </button>
        </div>

        {/* Admin Info Card */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 border border-primary/30 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="admin_panel_settings" className="text-primary" size={24} />
            <span className="font-bold text-foreground">
              {isOwner ? "👑 Dono" : "🛠️ Admin"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOwner 
              ? "Você tem acesso total ao sistema. Pode gerenciar admins e usuários."
              : "Você pode visualizar informações dos usuários."
            }
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuários..."
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total de usuários</div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="text-2xl font-bold text-primary">{users.filter(u => u.isAdmin).length}</div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-bold text-foreground">Usuários ({filteredUsers.length})</h3>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredUsers.map((user) => {
                const isOwnerUser = user.email === "hotclass@dono.com";
                return (
                  <div key={user.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{user.name}</span>
                        {isOwnerUser && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">👑 DONO</span>
                        )}
                        {!isOwnerUser && user.isAdmin && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">ADMIN</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    
                    {/* Toggle Admin Button - Only for owner and not for owner user */}
                    {isOwner && !isOwnerUser && (
                      <button
                        onClick={() => toggleAdmin(user)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          user.isAdmin 
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {user.isAdmin ? "Remover Admin" : "Tornar Admin"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Admin;
