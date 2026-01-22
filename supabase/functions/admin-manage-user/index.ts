import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is owner or admin
    const { data: isOwner } = await supabaseAdmin.rpc("is_owner", { _user_id: requestingUser.id });
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: requestingUser.id, _role: "admin" });

    if (!isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, password, name, userId, planType, expiresAt } = (body ?? {}) as {
      action?: "create" | "delete";
      email?: string;
      password?: string;
      name?: string;
      userId?: string;
      planType?: string;
      expiresAt?: string | null;
    };

    if (action === "create") {
      // Validate inputs
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        return new Response(JSON.stringify({ error: "Este email já está cadastrado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create user with admin API (auto-confirms email)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name || normalizedEmail.split("@")[0],
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = newUser.user.id;
      console.log(`Admin created new user: ${newUserId} (${normalizedEmail})`);

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create user plan - use provided expiresAt or calculate based on planType
      if (planType) {
        let finalExpiresAt = expiresAt || null;
        
        // If no expiresAt provided, calculate from planType
        if (!finalExpiresAt && planType !== "vitalicio") {
          const expDate = planType === "trimestral" 
            ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          finalExpiresAt = expDate.toISOString();
        }

        const { error: planError } = await supabaseAdmin
          .from("user_plans")
          .insert({
            user_id: newUserId,
            plan_type: planType,
            status: "active",
            expires_at: finalExpiresAt,
          });

        if (planError) {
          console.error("Error creating plan:", planError);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Conta criada com sucesso",
        user_id: newUserId 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "delete") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if target is owner
      const { data: targetIsOwner } = await supabaseAdmin.rpc("is_owner", { _user_id: userId });
      if (targetIsOwner) {
        return new Response(JSON.stringify({ error: "Não é possível excluir o dono" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin deleting user: ${userId}`);

      // Delete user plan
      const { error: planDeleteError } = await supabaseAdmin
        .from("user_plans")
        .delete()
        .eq("user_id", userId);

      if (planDeleteError) {
        console.error("Error deleting user plan:", planDeleteError);
      }

      // Delete profile
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (profileDeleteError) {
        console.error("Error deleting profile:", profileDeleteError);
      }

      // Delete authorized IPs
      const { error: ipsDeleteError } = await supabaseAdmin
        .from("authorized_ips")
        .delete()
        .eq("user_id", userId);

      if (ipsDeleteError) {
        console.error("Error deleting authorized IPs:", ipsDeleteError);
      }

      // Delete user roles
      const { error: rolesDeleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (rolesDeleteError) {
        console.error("Error deleting user roles:", rolesDeleteError);
      }

      // Delete group unlocks
      const { error: unlocksDeleteError } = await supabaseAdmin
        .from("user_group_unlocks")
        .delete()
        .eq("user_id", userId);

      if (unlocksDeleteError) {
        console.error("Error deleting group unlocks:", unlocksDeleteError);
      }

      // Delete terms acceptance
      const { error: termsDeleteError } = await supabaseAdmin
        .from("user_terms_acceptance")
        .delete()
        .eq("user_id", userId);

      if (termsDeleteError) {
        console.error("Error deleting terms acceptance:", termsDeleteError);
      }

      // Delete password reset codes
      const { error: codesDeleteError } = await supabaseAdmin
        .from("password_reset_codes")
        .delete()
        .eq("user_id", userId);

      if (codesDeleteError) {
        console.error("Error deleting password reset codes:", codesDeleteError);
      }

      // Delete IP unlock slots
      const { error: slotsDeleteError } = await supabaseAdmin
        .from("ip_unlock_slots")
        .delete()
        .eq("user_id", userId);

      if (slotsDeleteError) {
        console.error("Error deleting IP unlock slots:", slotsDeleteError);
      }

      // Finally delete the auth user
      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (userDeleteError) {
        console.error("Error deleting auth user:", userDeleteError);
        return new Response(JSON.stringify({ error: userDeleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`User completely deleted: ${userId}`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Conta excluída com sucesso" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Ação inválida. Use 'create' ou 'delete'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error: unknown) {
    console.error("Error in admin-manage-user:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
