import { Icon } from "@/components/ui/Icon";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  showUserInfo?: boolean;
  userName?: string;
  userStatus?: string;
}

export const Header = ({ showUserInfo = true, userName = "Marcos Silva", userStatus = "Acesso Total" }: HeaderProps) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Início", icon: "dashboard" },
    { path: "/grupos", label: "Meus Grupos", icon: "groups" },
    { path: "/buscar", label: "Buscar", icon: "search" },
    { path: "/alertas", label: "Alertas", icon: "notifications" },
    { path: "/ajustes", label: "Ajustes", icon: "settings" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
              <Icon name="menu" className="text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-primary font-bold">Hot Class</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon name={item.icon} filled={location.pathname === item.path} size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-base font-bold tracking-wide uppercase text-primary">
          Hot<span className="text-foreground">Class</span>
        </h1>

        <div className="flex items-center gap-2">
          {showUserInfo && (
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-bold text-foreground">{userName}</span>
              <span className="text-[10px] text-success font-medium uppercase tracking-wider">{userStatus}</span>
            </div>
          )}
          <button className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Icon name="person" size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
};
