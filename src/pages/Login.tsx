import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    
    // Simulate login
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast.success("Login realizado com sucesso!");
    navigate("/");
    setIsLoading(false);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-background">
      {/* Ambient Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto px-6 relative z-10 flex flex-col gap-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
            <Icon name="lock_open" className="text-primary-foreground" size={32} />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-foreground tracking-tight text-3xl font-bold leading-tight">
              Área de Acesso
            </h1>
            <p className="text-muted-foreground text-base font-normal leading-normal">
              Bem-vindo de volta
            </p>
          </div>
        </div>

        {/* Form Section */}
        <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <label className="text-foreground/90 text-sm font-medium leading-normal pl-1">
              Email ou usuário
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-muted-foreground">
                <Icon name="person" size={20} />
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
            <div className="flex justify-end pt-1">
              <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                Esqueceu a senha?
              </a>
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

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-muted-foreground text-sm">
            Não tem uma conta?{" "}
            <a href="#" className="text-foreground font-semibold hover:underline">
              Solicite acesso
            </a>
          </p>
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
