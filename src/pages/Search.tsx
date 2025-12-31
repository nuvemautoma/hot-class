import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Icon } from "@/components/ui/Icon";
import { GroupCard } from "@/components/groups/GroupCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  link: string;
  created_at: string;
}

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("name", { ascending: true });
    
    if (!error && data) {
      setGroups(data);
    }
    setLoading(false);
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        (group.description || "").toLowerCase().includes(query)
    );
  }, [searchQuery, groups]);

  const handleJoinGroup = (groupName: string, link: string) => {
    window.open(link, "_blank");
    toast.success(`Acessando ${groupName}...`);
  };

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
            placeholder="Buscar grupo (ex: VIP, 01)..."
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {searchQuery ? "Resultados" : "Todos os Grupos"}
          </h3>
          <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
            {filteredGroups.length} GRUPOS
          </span>
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                description={group.description || ""}
                icon="groups"
                isActive
                showBadge={false}
                onJoin={() => handleJoinGroup(group.name, group.link)}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Icon name="search_off" size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">
                {groups.length === 0 
                  ? "Nenhum grupo disponível" 
                  : `Nenhum grupo encontrado para "${searchQuery}"`
                }
              </p>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Search;