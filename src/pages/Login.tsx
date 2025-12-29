import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AuthView = "login" | "signup" | "forgot-password";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, loading } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Check if blocked
  useEffect(() => {
    if (searchParams.get("blocked") === "true") {
      toast.error("Limite de dispositivos atingido. Contate o suporte para liberar acesso.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    
    const { error, ipBlocked } = await signIn(email, password);
    
    if (error) {
      if (ipBlocked) {
        toast.error("Limite de dispositivos atingido. Entre em contato com o suporte.");
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
      setIsLoading(false);
      return;
    }
    
    toast.success("Login realizado com sucesso!");
    navigate("/");
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(email, password, name);
    
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Este e-mail já está cadastrado");
      } else {
        toast.error(error.message || "Erro ao criar conta");
      }
      setIsLoading(false);
      return;
    }
    
    toast.success("Conta criada com sucesso! Faça login.");
    setView("login");
    setPassword("");
    setConfirmPassword("");
    setIsLoading(false);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-background">
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto px-6 relative z-10 flex flex-col gap-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
            <Icon name={view === "signup" ? "person_add" : "lock_open"} className="text-primary-foreground" size={32} />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-foreground tracking-tight text-3xl font-bold leading-tight">
              {view === "login" ? "Área de Acesso" : view === "signup" ? "Criar Conta" : "Recuperar Senha"}
            </h1>
            <p className="text-muted-foreground text-base font-normal leading-normal">
              {view === "login" ? "Bem-vindo de volta" : view === "signup" ? "Preencha seus dados" : "Enviaremos instruções"}
            </p>
          </div>
        </div>

        {/* Login Form */}
        {view === "login" && (
          <form className="flex flex-col gap-5 w-full" onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Email
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="mail" size={20} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-4 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="ex: nome@empresa.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Senha
              </label>
              <div className="relative flex w-full items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="key" size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-12 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? "Entrando..." : "Entrar"}</span>
                {!isLoading && (
                  <Icon name="arrow_forward" size={20} className="transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {view === "signup" && (
          <form className="flex flex-col gap-4 w-full" onSubmit={handleSignUp}>
            {/* Name Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Nome
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="person" size={20} />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-4 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Email
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="mail" size={20} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-4 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="ex: nome@empresa.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Senha
              </label>
              <div className="relative flex w-full items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="key" size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-12 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
                Confirmar Senha
              </label>
              <div className="relative flex w-full items-center">
                <span className="absolute left-4 text-muted-foreground">
                  <Icon name="key" size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input focus:bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary h-12 pl-12 pr-4 placeholder:text-muted-foreground/50 text-base transition-all duration-200"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? "Criando..." : "Criar Conta"}</span>
                {!isLoading && (
                  <Icon name="arrow_forward" size={20} className="transition-transform group-hover:translate-x-1" />
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          {view === "login" ? (
            <p className="text-muted-foreground text-sm">
              Não tem uma conta?{" "}
              <button
                onClick={() => {
                  resetForm();
                  setView("signup");
                }}
                className="text-foreground font-semibold hover:underline"
              >
                Criar conta
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Já tem uma conta?{" "}
              <button
                onClick={() => {
                  resetForm();
                  setView("login");
                }}
                className="text-foreground font-semibold hover:underline"
              >
                Fazer login
              </button>
            </p>
          )}
        </div>

        {/* Trust Indicator */}
        <div className="mt-8 flex justify-center opacity-30">
          <div className="h-1 w-16 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default Login;
