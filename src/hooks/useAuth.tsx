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
  isOwner: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; ipBlocked?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
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
const OWNER_EMAIL = "hotclass@dono.com";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authorizedIPs, setAuthorizedIPs] = useState<AuthorizedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Get max allowed IPs
  const getMaxIPSlots = () => {
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

    if (existingIPs.some(existingIP => existingIP.ip_address === ip)) {
      return true;
    }

    if (existingIPs.length < maxSlots) {
      await supabase.from("authorized_ips").insert({
        user_id: userId,
        ip_address: ip,
        is_extra_slot: existingIPs.length >= 3
      });
      return true;
    }

    return false;
  };

  // Check admin status
  const checkAdminStatus = async (userId: string, email: string) => {
    // Check if owner
    if (email === OWNER_EMAIL) {
      setIsOwner(true);
      setIsAdmin(true);
      return;
    }

    setIsOwner(false);

    // Check if admin in user_roles
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
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
      await checkAdminStatus(userId, data.email);
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            setTimeout(() => {
              fetchProfile(session.user.id);
              fetchAuthorizedIPs(session.user.id);
            }, 0);
          } else {
            setProfile(null);
            setAuthorizedIPs([]);
            setIpBlocked(false);
            setIsOwner(false);
            setIsAdmin(false);
          }
        }
      );

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchAuthorizedIPs(session.user.id);
        
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

  // Sign up
  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });

    return { error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAuthorizedIPs([]);
    setIpBlocked(false);
    setIsOwner(false);
    setIsAdmin(false);
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

  // Update password (simplified - no verification needed)
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

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
        isOwner,
        isAdmin,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updatePassword,
        unlockIPSlot,
        refreshProfile,
        getMaxIPSlots
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
