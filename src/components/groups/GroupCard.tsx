import { Icon } from "@/components/ui/Icon";

interface GroupCardProps {
  name: string;
  description: string;
  icon: string;
  isActive?: boolean;
  showBadge?: boolean;
  onJoin?: () => void;
}

export const GroupCard = ({
  name,
  description,
  icon,
  isActive = true,
  showBadge = false,
  onJoin,
}: GroupCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card p-4 shadow-sm border border-border transition-all hover:border-primary/30">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="size-14 rounded-xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-primary border border-border">
            <Icon name={icon} filled size={28} />
          </div>
          {showBadge && (
            <div className="absolute -bottom-1 -right-1 bg-success size-4 rounded-full border-2 border-card flex items-center justify-center">
              <Icon name="check" className="text-success-foreground" size={10} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5 gap-2">
            <h4 className="text-lg font-bold text-foreground truncate">{name}</h4>
            {isActive && (
              <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded border border-success/20 shrink-0">
                LIBERADO
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={onJoin}
          className="flex-1 sm:flex-none w-full sm:w-auto h-10 px-6 rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          <span>Entrar no Grupo</span>
          <Icon name="arrow_outward" size={18} />
        </button>
      </div>
    </div>
  );
};
