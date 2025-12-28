import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportButton } from "@/components/layout/SupportButton";
import { GroupCard } from "@/components/groups/GroupCard";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";

const groupsData = [
  {
    id: 1,
    name: "Grupo Alpha VIP",
    description: "Networking de alto nível & vendas.",
    icon: "diamond",
    isActive: true,
  },
  {
    id: 2,
    name: "Lançamentos 2024",
    description: "Updates diários e materiais.",
    icon: "rocket_launch",
    isActive: true,
  },
  {
    id: 3,
    name: "Black Elite Club",
    description: "Mentoria exclusiva para membros.",
    icon: "crown",
    isActive: true,
  },
  {
    id: 4,
    name: "Mastermind 100k",
    description: "Estratégias avançadas de escala.",
    icon: "stars",
    isActive: true,
  },
];

const Groups = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = groupsData.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGroups = filteredGroups.filter((g) => g.isActive);

  const handleJoinGroup = (groupName: string) => {
    toast.success(`Acessando ${groupName}...`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-6 pb-20">
        <header className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">
            Meus Grupos
          </h2>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            Acesse todos os grupos disponíveis para você.
            <br className="hidden sm:block" />
            Conecte-se com sua comunidade agora.
          </p>
        </header>

        {/* Search */}
        <div className="mb-8 relative group">
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

        {/* Groups List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1 mt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Grupos Liberados
            </h3>
            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
              {activeGroups.length} ATIVOS
            </span>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="search_off" size={48} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum grupo encontrado</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                description={group.description}
                icon={group.icon}
                isActive={group.isActive}
                showBadge={group.id === 1}
                onJoin={() => handleJoinGroup(group.name)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center pb-4">
          <p className="text-xs text-muted-foreground">
            Precisa de ajuda com algum link?
            <br />
            <a href="#" className="text-primary hover:underline font-medium">
              Contatar Suporte
            </a>
          </p>
        </div>
      </main>

      <SupportButton />
      <BottomNav />
    </div>
  );
};

export default Groups;
