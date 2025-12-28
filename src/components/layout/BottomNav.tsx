import { Icon } from "@/components/ui/Icon";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", label: "Início", icon: "dashboard" },
  { path: "/buscar", label: "Buscar", icon: "search" },
  { path: "/alertas", label: "Alertas", icon: "notifications" },
  { path: "/ajustes", label: "Ajustes", icon: "settings" },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav border-t border-border safe-area-bottom z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={item.icon} filled={isActive} size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
