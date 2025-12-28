import { Icon } from "@/components/ui/Icon";

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  variant?: "primary" | "warning";
}

export const StatCard = ({ icon, value, label, variant = "primary" }: StatCardProps) => {
  const iconColorClass = variant === "primary" ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500";

  return (
    <div className="flex-1 bg-surface/50 rounded-xl p-4 border border-border flex flex-col items-start gap-2">
      <div className={`p-2 rounded-lg ${iconColorClass}`}>
        <Icon name={icon} size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
};
