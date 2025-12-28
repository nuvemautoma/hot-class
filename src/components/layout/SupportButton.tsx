import { Icon } from "@/components/ui/Icon";

export const SupportButton = () => {
  return (
    <button className="fixed bottom-24 right-6 size-12 bg-card text-foreground rounded-full shadow-2xl shadow-black/50 flex items-center justify-center border border-border z-50 hover:bg-secondary transition-colors">
      <Icon name="headset_mic" />
    </button>
  );
};
