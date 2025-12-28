import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const recentSearches = ["Grupo VIP", "Lançamentos", "Mastermind"];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-24">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-6">
          Buscar
        </h2>

        {/* Search Input */}
        <div className="relative group mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon
              name="search"
              className="text-muted-foreground group-focus-within:text-primary transition-colors"
            />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border-none rounded-xl bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-all"
            placeholder="O que você procura?"
          />
        </div>

        {/* Recent Searches */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Buscas Recentes
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, i) => (
              <button
                key={i}
                onClick={() => setSearchQuery(search)}
                className="px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>

        {/* Placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Icon name="manage_search" size={64} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Digite para buscar grupos, conteúdos e mais</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Search;
