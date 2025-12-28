import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type SettingsView = "main" | "edit-name" | "edit-email" | "change-password" | "verify-code" | "notifications" | "unlock-ip";

const Settings = () => {
  const navigate = useNavigate();
  const { profile, authorizedIPs, signOut, updateProfile, unlockIPSlot, refreshProfile, getMaxIPSlots, user } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>("main");
  
  // Edit states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Verification code states
  const [verificationCode, setVerificationCode] = useState("");
  const [codeTimer, setCodeTimer] = useState(900); // 15 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState("");
  
  // IP unlock state
  const [unlockPassword, setUnlockPassword] = useState("");
  
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  // Timer for verification code
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentView === "verify-code" && codeTimer > 0) {
      interval = setInterval(() => {
        setCodeTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView, codeTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleRequestPasswordChange = async () => {
    if (!currentPassword) {
      toast.error("Digite sua senha atual");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    
    setIsLoading(true);
    
    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: currentPassword
    });
    
    if (signInError) {
      setIsLoading(false);
      toast.error("Senha atual incorreta");
      return;
    }
    
    // Generate and store verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const { error: codeError } = await supabase
      .from("password_reset_codes")
      .insert({
        user_id: user?.id,
        code,
        expires_at: expiresAt.toISOString()
      });
    
    setIsLoading(false);
    
    if (codeError) {
      toast.error("Erro ao gerar código");
      return;
    }
    
    // In a real app, send email with code. For now, show code in toast for testing
    toast.success(`Código de verificação: ${code}`);
    
    setPendingNewPassword(newPassword);
    setCodeTimer(900);
    setCanResend(false);
    setCurrentView("verify-code");
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }
    
    setIsLoading(true);
    
    // Check code
    const { data: codes } = await supabase
      .from("password_reset_codes")
      .select("*")
      .eq("user_id", user?.id)
      .eq("code", verificationCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (!codes || codes.length === 0) {
      setIsLoading(false);
      toast.error("Código inválido ou expirado");
      return;
    }
    
    // Mark code as used
    await supabase
      .from("password_reset_codes")
      .update({ used: true })
      .eq("id", codes[0].id);
    
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: pendingNewPassword
    });
    
    setIsLoading(false);
    
    if (updateError) {
      toast.error("Erro ao atualizar senha");
      return;
    }
    
    toast.success("Senha alterada com sucesso!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setPendingNewPassword("");
    setCurrentView("main");
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await supabase
      .from("password_reset_codes")
      .insert({
        user_id: user?.id,
        code,
        expires_at: expiresAt.toISOString()
      });
    
    setIsLoading(false);
    
    // In a real app, send email. For testing, show in toast
    toast.success(`Novo código: ${code}`);
    setCodeTimer(900);
    setCanResend(false);
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
    setVerificationCode("");
    setUnlockPassword("");
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
  const usedIPs = authorizedIPs.length;
  const maxIPs = getMaxIPSlots();

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
            </div>
          </div>

          {/* IP Info Card */}
          <div className="bg-card rounded-xl p-4 border border-border mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon name="devices" className="text-primary" size={20} />
                <span className="font-medium text-foreground">Dispositivos Autorizados</span>
              </div>
              <span className="text-sm font-bold text-primary">{usedIPs}/{maxIPs}</span>
            </div>
            <div className="space-y-2">
              {authorizedIPs.map((ip, index) => (
                <div key={ip.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon name="check_circle" className="text-success" size={16} />
                  <span>Dispositivo {index + 1}</span>
                  {ip.is_extra_slot && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">EXTRA</span>
                  )}
                </div>
              ))}
              {usedIPs < maxIPs && (
                <p className="text-xs text-muted-foreground">
                  {maxIPs - usedIPs} slot(s) disponível(is)
                </p>
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

            {/* Unlock IP */}
            <button
              onClick={() => setCurrentView("unlock-ip")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <Icon name="vpn_key" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Liberar IP</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setCurrentView("notifications")}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-secondary transition-colors border-b border-border"
            >
              <Icon name="notifications" className="text-muted-foreground" size={22} />
              <span className="flex-1 text-left font-medium text-foreground">Notificações</span>
              <Icon name="chevron_right" className="text-muted-foreground" size={20} />
            </button>

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

  // Change Password View
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
              <label className="text-sm font-medium text-foreground">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 h-12 px-4"
                placeholder="Digite sua senha atual"
              />
            </div>

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

            <p className="text-xs text-muted-foreground">
              Um código de verificação será enviado para seu e-mail.
            </p>

            <button
              onClick={handleRequestPasswordChange}
              disabled={isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Enviando..." : "Enviar Código"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Verify Code View
  if (currentView === "verify-code") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center px-4 py-3">
            <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="arrow_back" size={24} />
            </button>
            <h1 className="flex-1 text-center text-lg font-bold">Verificar Código</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6">
          <div className="text-center mb-8">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="mail" className="text-primary" size={32} />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Verifique seu e-mail</h2>
            <p className="text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para<br />
              <span className="text-foreground font-medium">{userEmail}</span>
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-border bg-input text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 h-14 px-4"
              placeholder="000000"
              maxLength={6}
            />

            <div className="text-center">
              {codeTimer > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Código expira em <span className="text-primary font-bold">{formatTime(codeTimer)}</span>
                </p>
              ) : (
                <p className="text-sm text-destructive font-medium">Código expirado</p>
              )}
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={codeTimer === 0 || isLoading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verificando..." : "Verificar"}
            </button>

            <button
              onClick={handleResendCode}
              disabled={(!canResend && codeTimer > 0) || isLoading}
              className="w-full h-12 border border-border text-foreground font-medium rounded-xl transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reenviar Código
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
