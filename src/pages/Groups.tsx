import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportButton } from "@/components/layout/SupportButton";
import { GroupCard } from "@/components/groups/GroupCard";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Group {
  id: string;
  name: string;
  description: string | null;
  link: string;
  created_at: string;
}

// Function to generate a seeded random number
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Function to shuffle array with seed
const shuffleWithSeed = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Groups = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockAllGroups, setUnlockAllGroups] = useState(false);
  const [userUnlocked, setUserUnlocked] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchGroups();
    fetchUnlockSetting();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserUnlock();
    }
  }, [user]);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setGroups(data);
    }
    setLoading(false);
  };

  const fetchUnlockSetting = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "unlock_all_groups")
      .maybeSingle();

    if (!error && data) {
      setUnlockAllGroups(data.value === "true");
    }
  };

  const fetchUserUnlock = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("user_group_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setUserUnlocked(true);
    }
  };

  // Calculate which groups to show based on account age
  const visibleGroups = useMemo(() => {
    if (!profile || groups.length === 0) return groups;

    // If admin enabled unlock all groups OR user is individually unlocked, show all
    if (unlockAllGroups || userUnlocked) {
      return groups;
    }

    const accountCreatedAt = new Date(profile.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // After 6 days (on day 7+), show all groups
    if (daysSinceCreation >= 6) {
      return groups;
    }

    // Generate a seed based on user_id for consistent randomization
    const userIdSeed = user?.id 
      ? user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : 0;

    // Shuffle groups with user-specific seed
    const shuffledGroups = shuffleWithSeed(groups, userIdSeed);

    // During first 7 days, progressively unlock groups
    // Day 0: 1 group, Day 1: 2 groups, ..., Day 6+: all groups
    const groupsToShow = Math.min(daysSinceCreation + 1, shuffledGroups.length);
    
    return shuffledGroups.slice(0, groupsToShow);
  }, [groups, profile, user, unlockAllGroups, userUnlocked]);

  const filteredGroups = visibleGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinGroup = (groupName: string, link: string) => {
    window.open(link, "_blank");
    toast.success(`Acessando ${groupName}...`);
  };

  // Calculate remaining days info
  const accountInfo = useMemo(() => {
    if (!profile) return null;
    
    // If unlock all groups is enabled or user is individually unlocked, don't show the notice
    if (unlockAllGroups || userUnlocked) return null;
    
    const accountCreatedAt = new Date(profile.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreation >= 6) return null;
    
    const daysRemaining = 6 - daysSinceCreation;
    const totalGroups = groups.length;
    const unlockedGroups = Math.min(daysSinceCreation + 1, totalGroups);
    
    return {
      daysRemaining,
      unlockedGroups,
      totalGroups,
    };
  }, [profile, groups, unlockAllGroups, userUnlocked]);

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

        {/* Progressive Unlock Notice */}
        {accountInfo && (
          <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon name="lock_open" size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">
                  Liberação Progressiva
                </p>
                <p className="text-xs text-muted-foreground">
                  {accountInfo.unlockedGroups} de {accountInfo.totalGroups} grupos liberados • 
                  Próximo em {accountInfo.daysRemaining > 0 ? `${accountInfo.daysRemaining} dia${accountInfo.daysRemaining > 1 ? 's' : ''}` : 'breve'}
                </p>
              </div>
            </div>
          </div>
        )}

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
              {filteredGroups.length} ATIVOS
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="groups" size={48} className="mx-auto mb-2 opacity-50" />
              <p>{groups.length === 0 ? "Nenhum grupo disponível" : "Nenhum grupo encontrado"}</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                description={group.description || ""}
                icon="groups"
                isActive
                showBadge={false}
                onJoin={() => handleJoinGroup(group.name, group.link)}
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