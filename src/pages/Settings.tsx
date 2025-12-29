import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type SettingsView = "main" | "edit-name" | "edit-email" | "change-password" | "notifications" | "unlock-ip";

const Settings = () => {
  const navigate = useNavigate();
  const { profile, signOut, updateProfile, updatePassword, unlockIPSlot, refreshProfile, isOwner, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>("main");
  
  // Edit states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // IP unlock state
  const [unlockPassword, setUnlockPassword] = useState("");
  
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveName = async () => {
    if (!editName.trim()) {
      toast.error("Digite um nome válido");
      return;
    }
    
    setIsLoading(true);
    const { error } = await updateProfile({ name: editName });
    setIsLoading(false);
    
    if (error) {
      toast.error("Erro ao atualizar nome");
      return;
    }
    
    toast.success("Nome atualizado com sucesso!");
    setCurrentView("main");
  };

  const handleSaveEmail = async () => {
    if (!editEmail.trim() || !editEmail.includes("@")) {
      toast.error("Digite um e-mail válido");
      return;
    }
    
    setIsLoading(true);
    const { error } = await updateProfile({ email: editEmail, email_changed: true });
    setIsLoading(false);
    
    if (error) {
      toast.error("Erro ao atualizar e-mail");
      return;
    }
    
    toast.success("E-mail atualizado com sucesso!");
    setCurrentView("main");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);
    
    if (error) {
      toast.error("Erro ao atualizar senha");
      return;
    }
    
    toast.success("Senha alterada com sucesso!");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentView("main");
  };

  const handleUnlockIP = async () => {
    if (!unlockPassword) {
      toast.error("Digite a senha");
      return;
    }
    
    setIsLoading(true);
    const { error } = await unlockIPSlot(unlockPassword);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    toast.success("Novo slot de IP liberado!");
    setUnlockPassword("");
    setCurrentView("main");
    refreshProfile();
  };

  const handleBack = useCallback(() => {
    setCurrentView("main");
    setUnlockPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/login");
  };

  const openSupport = () => {
    window.open("https://wa.me/5517982210363", "_blank");
  };

  const userName = profile?.name || "Usuário";
  const userEmail = profile?.email || "";
  const emailChanged = profile?.email_changed || false;

  // Main settings view
  if (currentView === "main") {
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
              <h3 className="font-bold text-foreground">{userName}</h3>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              {(isOwner || isAdmin) && (
                <span className="text-xs text-primary font-medium">
                  {isOwner ? "👑 Dono" : "🛠️ Admin"}
                </span>
              )}
            </div>
          </div>

          {/* Settings List */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Edit Name */}
            <button
              onClick={() => {
                setEditName(userName);
                setCurrentView("edit-name");
              }}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <Icon name="person" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Alterar Nome</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

            {/* Edit Email */}
            <button
              onClick={() => {
                if (emailChanged) {
                  toast.error("O e-mail só pode ser alterado uma vez");
                  return;
                }
                setEditEmail(userEmail);
                setCurrentView("edit-email");
              }}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border ${emailChanged ? "opacity-50" : ""}`}
            >
              <Icon name="mail" className="text-muted-foreground" size={22} />
              <div className="flex-1 text-left">
                <span className="font-medium text-foreground">Alterar E-mail</span>
                {emailChanged && (
                  <p className="text-xs text-muted-foreground">Já alterado</p>
                )}
              </div>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

            {/* Change Password */}
            <button
              onClick={() => setCurrentView("change-password")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <Icon name="lock" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Alterar Senha</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

            {/* Unlock IP - Only show for owner/admin */}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => setCurrentView("unlock-ip")}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
              >
                <Icon name="vpn_key" className="text-muted-foreground" size={22} />
                <span className="flex-1 text-left font-medium text-foreground">Liberar IP</span>
                <Icon name="chevron_right" className="text-muted-foreground" size={20} />
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={() => setCurrentView("notifications")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <Icon name="notifications" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Notificações</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

            {/* Admin Panel - Only show for owner/admin */}
            {(isOwner || isAdmin) && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
              >
                <Icon name="admin_panel_settings" className="text-primary" size={22} />
                <span className="flex-1 text-left font-medium text-primary">Painel Admin</span>
                <Icon name="chevron_right" className="text-primary" size={20} />
              </button>
            )}

            {/* Support */}
            <button
              onClick={openSupport}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors"
            >
              <Icon name="headset_mic" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Suporte</span>
              <Icon name="arrow_outward" className="text-muted-foreground" size={20} />
            </button>
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
  }

  // Edit Name View
  if (currentView === "edit-name") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Alterar Nome</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground">Seu nome</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
              placeholder="Digite seu nome"
            />
            <button
              onClick={handleSaveName}
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Edit Email View
  if (currentView === "edit-email") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Alterar E-mail</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Icon name="info" className="text-primary shrink-0" size={20} />
              <p className="text-sm text-foreground">
                Atenção: o e-mail só pode ser alterado uma vez.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground">Novo e-mail</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
              placeholder="Digite seu novo e-mail"
            />
            <button
              onClick={handleSaveEmail}
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Change Password View (Simplified - no current password, no verification)
  if (currentView === "change-password") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Alterar Senha</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
                placeholder="Digite sua nova senha"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
                placeholder="Confirme sua nova senha"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Alterar Senha"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Unlock IP View
  if (currentView === "unlock-ip") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Liberar IP</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Icon name="info" className="text-primary shrink-0" size={20} />
              <p className="text-sm text-foreground">
                Digite a senha especial para liberar mais um slot de dispositivo.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground">Senha de liberação</label>
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
              placeholder="Digite a senha"
            />
            <button
              onClick={handleUnlockIP}
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Liberando..." : "Liberar Slot"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Notifications View
  if (currentView === "notifications") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Notificações</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Icon name="notifications" className="text-muted-foreground" size={22} />
                <span className="font-medium text-foreground">Receber notificações</span>
              </div>
              <button
                onClick={() => {
                  setNotificationsEnabled(!notificationsEnabled);
                  toast.success(notificationsEnabled ? "Notificações desativadas" : "Notificações ativadas");
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-1 size-4 bg-white rounded-full transition-transform ${notificationsEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default Settings;
