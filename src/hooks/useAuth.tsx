import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  email_changed: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthorizedIP {
  id: string;
  user_id: string;
  ip_address: string;
  is_extra_slot: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authorizedIPs: AuthorizedIP[];
  loading: boolean;
  currentIP: string | null;
  ipBlocked: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; ipBlocked?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  unlockIPSlot: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  getMaxIPSlots: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const IP_UNLOCK_PASSWORD = "HCLASS14";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authorizedIPs, setAuthorizedIPs] = useState<AuthorizedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [ipBlocked, setIpBlocked] = useState(false);

  // Get current IP
  const fetchCurrentIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setCurrentIP(data.ip);
      return data.ip;
    } catch (error) {
      console.error("Error fetching IP:", error);
      return null;
    }
  };

  // Get number of extra IP slots
  const getExtraSlots = async (userId: string) => {
    const { data } = await supabase
      .from("ip_unlock_slots")
      .select("id")
      .eq("user_id", userId);
    return data?.length || 0;
  };

  // Get max allowed IPs
  const getMaxIPSlots = () => {
    // Base 3 + any extra slots unlocked
    const extraSlots = authorizedIPs.filter(ip => ip.is_extra_slot).length;
    return 3 + extraSlots;
  };

  // Check if IP is authorized
  const checkIPAuthorization = async (userId: string, ip: string): Promise<boolean> => {
    const { data: ips } = await supabase
      .from("authorized_ips")
      .select("*")
      .eq("user_id", userId);

    const { data: extraSlots } = await supabase
      .from("ip_unlock_slots")
      .select("id")
      .eq("user_id", userId);

    const maxSlots = 3 + (extraSlots?.length || 0);
    const existingIPs = ips || [];

    // Check if IP already authorized
    if (existingIPs.some(existingIP => existingIP.ip_address === ip)) {
      return true;
    }

    // Check if we have slots available
    if (existingIPs.length < maxSlots) {
      // Register new IP
      await supabase.from("authorized_ips").insert({
        user_id: userId,
        ip_address: ip,
        is_extra_slot: existingIPs.length >= 3
      });
      return true;
    }

    // No slots available, IP blocked
    return false;
  };

  // Fetch profile
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  // Fetch authorized IPs
  const fetchAuthorizedIPs = async (userId: string) => {
    const { data } = await supabase
      .from("authorized_ips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    
    if (data) {
      setAuthorizedIPs(data);
    }
  };

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Defer fetching to avoid deadlock
            setTimeout(() => {
              fetchProfile(session.user.id);
              fetchAuthorizedIPs(session.user.id);
            }, 0);
          } else {
            setProfile(null);
            setAuthorizedIPs([]);
            setIpBlocked(false);
          }
        }
      );

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchAuthorizedIPs(session.user.id);
        
        // Check IP on existing session
        const ip = await fetchCurrentIP();
        if (ip) {
          const isAuthorized = await checkIPAuthorization(session.user.id, ip);
          if (!isAuthorized) {
            setIpBlocked(true);
            await supabase.auth.signOut();
          }
        }
      } else {
        await fetchCurrentIP();
      }

      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  // Realtime subscription for authorized_ips
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("authorized_ips_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "authorized_ips",
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchAuthorizedIPs(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Sign in
  const signIn = async (email: string, password: string) => {
    const ip = currentIP || await fetchCurrentIP();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error };
    }

    if (data.user && ip) {
      const isAuthorized = await checkIPAuthorization(data.user.id, ip);
      if (!isAuthorized) {
        await supabase.auth.signOut();
        setIpBlocked(true);
        return { 
          error: new Error("Limite de dispositivos atingido. Entre em contato com o suporte."),
          ipBlocked: true
        };
      }
    }

    return { error: null };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthorizedIPs([]);
    setIpBlocked(false);
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    if (!error) {
      await fetchProfile(user.id);
    }

    return { error };
  };

  // Unlock IP slot
  const unlockIPSlot = async (password: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };

    if (password !== IP_UNLOCK_PASSWORD) {
      return { error: new Error("Senha incorreta") };
    }

    const { error } = await supabase
      .from("ip_unlock_slots")
      .insert({ user_id: user.id });

    if (!error) {
      await fetchAuthorizedIPs(user.id);
    }

    return { error };
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchAuthorizedIPs(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        authorizedIPs,
        loading,
        currentIP,
        ipBlocked,
        signIn,
        signOut,
        updateProfile,
        unlockIPSlot,
        refreshProfile,
        getMaxIPSlots
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
