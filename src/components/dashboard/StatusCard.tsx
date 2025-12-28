import { Icon } from "@/components/ui/Icon";

interface StatusCardProps {
  planName: string;
  isActive: boolean;
  expirationDate: string;
  planType: string;
}

export const StatusCard = ({ planName, isActive, expirationDate, planType }: StatusCardProps) => {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-lg group">
      {/* Decorative background glow */}
      <div className="absolute -right-10 -top-10 h-40 w-40 bg-primary/10 blur-[50px] rounded-full" />

      <div className="relative p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {planName}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {isActive && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                </span>
              )}
              <span className="text-lg font-bold text-foreground">
                Status: {isActive ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
          <Icon name="verified_user" className="text-primary/80" size={32} />
        </div>

        <div className="h-px w-full bg-border" />

        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Expira em</p>
            <p className="text-base font-medium text-foreground">{expirationDate}</p>
          </div>
          <div className="bg-surface px-3 py-1 rounded text-xs font-medium text-primary border border-primary/20">
            {planType}
          </div>
        </div>
      </div>
    </div>
  );
};
