import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const TermsPopup = () => {
  const { user, profile, signOut } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    checkTermsStatus();
  }, [user, profile]);

  const checkTermsStatus = async () => {
    if (!user || !profile) return;

    // Check account age (first 3 days)
    const accountCreatedAt = new Date(profile.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Only show popup in the first 3 days (0, 1, 2)
    if (daysSinceCreation >= 3) {
      setLoading(false);
      return;
    }

    // Check if user already accepted terms
    const { data: acceptance } = await supabase
      .from("user_terms_acceptance")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (acceptance) {
      // User already accepted
      setLoading(false);
      return;
    }

    // Fetch terms content
    const { data: termsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "terms_content")
      .maybeSingle();

    if (termsData?.value) {
      setTermsContent(termsData.value);
      setShowTerms(true);
    }

    setLoading(false);
  };

  const handleAccept = async () => {
    if (!user) return;

    setAccepting(true);

    const { error } = await supabase
      .from("user_terms_acceptance")
      .insert({
        user_id: user.id,
        terms_version: "1.0",
      });

    setAccepting(false);

    if (error) {
      console.error("Error accepting terms:", error);
      return;
    }

    setShowTerms(false);
  };

  const handleDecline = async () => {
    // Log user out if they decline
    await signOut();
  };

  if (loading || !showTerms) return null;

  return (
    <Dialog open={showTerms} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md mx-4 bg-card border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon name="gavel" size={24} className="text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Termos de Uso</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Leia e aceite para continuar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="prose prose-sm prose-invert">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {termsContent}
            </p>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              <>
                <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Icon name="check_circle" size={18} className="mr-2" />
                Aceitar e Continuar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDecline}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <Icon name="cancel" size={18} className="mr-2" />
            Recusar e Sair
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Ao aceitar, você concorda com todos os termos e condições da plataforma Hotfy.
        </p>
      </DialogContent>
    </Dialog>
  );
};
