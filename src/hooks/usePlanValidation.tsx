import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserPlan {
  id: string;
  user_id: string;
  plan_type: 'mensal' | 'trimestral' | 'vitalicio';
  status: 'active' | 'inactive' | 'expired';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const usePlanValidation = () => {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching plan:", error);
          setLoading(false);
          return;
        }

        if (data) {
          setPlan(data as UserPlan);
          
          // Check if plan is valid
          const now = new Date();
          const isActiveStatus = data.status === 'active';
          const isNotExpired = !data.expires_at || new Date(data.expires_at) > now;
          
          if (isActiveStatus && isNotExpired) {
            setIsValid(true);
            setIsExpired(false);
          } else {
            setIsValid(false);
            setIsExpired(data.expires_at ? new Date(data.expires_at) <= now : false);
            
            // Update status to expired if it was active but now expired
            if (data.status === 'active' && data.expires_at && new Date(data.expires_at) <= now) {
              await supabase
                .from("user_plans")
                .update({ status: 'expired' })
                .eq("id", data.id);
            }
          }
        } else {
          // No plan found - user has no subscription
          setIsValid(false);
          setIsExpired(false);
        }
      } catch (err) {
        console.error("Error in plan validation:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchPlan();
    }
  }, [user, authLoading]);

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'mensal': return 'Mensal';
      case 'trimestral': return 'Trimestral';
      case 'vitalicio': return 'Vitalício';
      default: return planType;
    }
  };

  const getDaysRemaining = () => {
    if (!plan?.expires_at) return null;
    const now = new Date();
    const expires = new Date(plan.expires_at);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return {
    plan,
    loading: loading || authLoading,
    isValid,
    isExpired,
    getPlanLabel,
    getDaysRemaining,
  };
};
