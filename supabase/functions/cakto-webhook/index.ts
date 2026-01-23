import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cakto-secret",
};

// Cakto webhook secret for validation
const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

interface CaktoPayload {
  // All possible email fields from Cakto
  email?: string;
  buyer_email?: string;
  customer_email?: string;
  cliente_email?: string;
  comprador_email?: string;
  customer?: { email?: string; name?: string };
  buyer?: { email?: string; name?: string };
  // Name fields
  name?: string;
  buyer_name?: string;
  customer_name?: string;
  cliente_nome?: string;
  comprador_nome?: string;
  // Event info
  status?: string;
  event?: string;
  type?: string;
  action?: string;
  transaction_status?: string;
  payment_status?: string;
  // Secret fields
  webhook_secret?: string;
  secret?: string;
  // Any other fields
  [key: string]: unknown;
}

// Event types that should delete the user
const DELETE_EVENTS = [
  'refund', 'refunded', 'reembolso',
  'chargeback', 'dispute',
  'subscription_cancelled', 'subscription_canceled', 'assinatura_cancelada',
  'payment_failed', 'pagamento_falhou',
  'cancelled', 'canceled', 'cancelado',
  'expired', 'expirado',
];

// Event types that should create/update the user
const APPROVED_EVENTS = [
  'approved', 'paid', 'payment_approved', 'pagamento_aprovado',
  'aprovado', 'completed', 'success', 'active', 'ativo',
  'confirmed', 'confirmado', 'purchase', 'compra',
];

// Extract email from various possible fields
function extractEmail(payload: CaktoPayload): string | null {
  // Direct fields
  const directFields = ['email', 'buyer_email', 'customer_email', 'cliente_email', 'comprador_email'];
  
  for (const field of directFields) {
    const value = payload[field];
    if (typeof value === 'string' && value.includes('@')) {
      console.log(`[CAKTO] Found email in field "${field}": ${value}`);
      return value.toLowerCase().trim();
    }
  }

  // Nested objects
  if (payload.customer && typeof payload.customer === 'object' && payload.customer.email) {
    console.log(`[CAKTO] Found email in customer.email: ${payload.customer.email}`);
    return payload.customer.email.toLowerCase().trim();
  }
  
  if (payload.buyer && typeof payload.buyer === 'object' && payload.buyer.email) {
    console.log(`[CAKTO] Found email in buyer.email: ${payload.buyer.email}`);
    return payload.buyer.email.toLowerCase().trim();
  }

  // Search all fields for anything that looks like an email
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
      console.log(`[CAKTO] Found email in field "${key}": ${value}`);
      return value.toLowerCase().trim();
    }
    // Check nested objects
    if (typeof value === 'object' && value !== null) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (typeof nestedValue === 'string' && nestedValue.includes('@') && nestedValue.includes('.')) {
          console.log(`[CAKTO] Found email in ${key}.${nestedKey}: ${nestedValue}`);
          return nestedValue.toLowerCase().trim();
        }
      }
    }
  }

  return null;
}

// Extract name from various possible fields
function extractName(payload: CaktoPayload): string {
  const nameFields = ['name', 'buyer_name', 'customer_name', 'cliente_nome', 'comprador_nome'];
  
  for (const field of nameFields) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  // Nested objects
  if (payload.customer && typeof payload.customer === 'object' && payload.customer.name) {
    return payload.customer.name.trim();
  }
  
  if (payload.buyer && typeof payload.buyer === 'object' && payload.buyer.name) {
    return payload.buyer.name.trim();
  }

  return '';
}

// Determine the event type from payload
function getEventType(payload: CaktoPayload): 'create' | 'delete' | 'unknown' {
  const event = (
    payload.event || 
    payload.type || 
    payload.action || 
    payload.status || 
    payload.transaction_status || 
    payload.payment_status || 
    ''
  ).toLowerCase().trim();
  
  console.log(`[CAKTO] Raw event value: "${event}"`);
  
  // Check if it's a delete event
  for (const deleteEvent of DELETE_EVENTS) {
    if (event.includes(deleteEvent)) {
      console.log(`[CAKTO] Matched DELETE event: ${deleteEvent}`);
      return 'delete';
    }
  }
  
  // Check if it's a create/update event
  for (const approvedEvent of APPROVED_EVENTS) {
    if (event.includes(approvedEvent)) {
      console.log(`[CAKTO] Matched APPROVED event: ${approvedEvent}`);
      return 'create';
    }
  }
  
  // Default: treat as create for new purchases (most webhooks are for approved purchases)
  console.log('[CAKTO] Event type unknown, defaulting to CREATE (assuming approved purchase)');
  return 'create';
}

Deno.serve(async (req) => {
  console.log('[CAKTO] ========== WEBHOOK RECEIVED ==========');
  console.log(`[CAKTO] Method: ${req.method}`);
  console.log(`[CAKTO] URL: ${req.url}`);
  console.log(`[CAKTO] Timestamp: ${new Date().toISOString()}`);
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    console.log(`[CAKTO] ERROR: Method ${req.method} not allowed`);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse payload
    let payload: CaktoPayload;
    let rawBody: string;
    
    try {
      rawBody = await req.text();
      console.log(`[CAKTO] Raw body (first 1000 chars): ${rawBody.substring(0, 1000)}`);
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[CAKTO] ERROR: Failed to parse JSON body:', parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("[CAKTO] Parsed payload keys:", Object.keys(payload));

    // Validate webhook secret if configured
    if (CAKTO_WEBHOOK_SECRET) {
      const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-cakto-secret");
      const payloadSecret = payload.webhook_secret || payload.secret;
      const receivedSecret = headerSecret || payloadSecret;

      if (receivedSecret !== CAKTO_WEBHOOK_SECRET) {
        console.error("[CAKTO] ERROR: Invalid webhook secret!");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[CAKTO] Webhook secret validated ✓");
    } else {
      console.log("[CAKTO] No webhook secret configured, accepting request");
    }

    // Extract email - REQUIRED
    const email = extractEmail(payload);
    
    if (!email) {
      console.error("[CAKTO] ERROR: No email found in payload!");
      console.error("[CAKTO] Full payload:", JSON.stringify(payload, null, 2));
      return new Response(JSON.stringify({ 
        error: "Email is required",
        message: "No email found in webhook payload",
        received_keys: Object.keys(payload)
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[CAKTO] Email extracted: ${email}`);
    
    // Extract name (optional)
    const name = extractName(payload) || email.split("@")[0];
    console.log(`[CAKTO] Name extracted: ${name}`);
    
    // Determine event type
    const eventType = getEventType(payload);
    console.log(`[CAKTO] Event type: ${eventType}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[CAKTO] ERROR: Missing Supabase environment variables!");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user already exists
    console.log(`[CAKTO] Checking if user exists: ${email}`);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("[CAKTO] ERROR listing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );
    
    console.log(`[CAKTO] User exists: ${existingUser ? 'YES (' + existingUser.id + ')' : 'NO'}`);

    // Handle DELETE events (refund, chargeback, etc.)
    if (eventType === 'delete') {
      if (!existingUser) {
        console.log(`[CAKTO] User not found for deletion`);
        return new Response(JSON.stringify({
          success: true,
          message: "User not found, nothing to delete",
          email: email
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = existingUser.id;
      console.log(`[CAKTO] DELETING user: ${userId}`);

      // Delete all related data from all tables
      const tables = [
        'user_plans', 'profiles', 'authorized_ips', 'user_roles',
        'user_group_unlocks', 'user_terms_acceptance', 'password_reset_codes',
        'ip_unlock_slots', 'notifications'
      ];
      
      for (const table of tables) {
        const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
        if (error) {
          console.log(`[CAKTO] Error deleting from ${table}: ${error.message}`);
        } else {
          console.log(`[CAKTO] Deleted from ${table} ✓`);
        }
      }

      // Delete auth user
      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (userDeleteError) {
        console.error("[CAKTO] ERROR deleting auth user:", userDeleteError);
        throw userDeleteError;
      }

      console.log(`[CAKTO] User ${email} completely deleted ✓`);

      return new Response(JSON.stringify({
        success: true,
        message: "User deleted successfully",
        email: email
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle CREATE events (approved purchase)
    const DEFAULT_PASSWORD = "SUPORTE10#";
    let userId: string;

    if (existingUser) {
      // User already exists - update their plan to active lifetime
      userId = existingUser.id;
      console.log(`[CAKTO] User already exists, updating plan to lifetime`);
      
      // Check if plan exists
      const { data: existingPlan } = await supabaseAdmin
        .from("user_plans")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingPlan) {
        // Update existing plan
        const { error: updateError } = await supabaseAdmin
          .from("user_plans")
          .update({
            plan_type: "vitalicio",
            status: "active",
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("[CAKTO] Error updating plan:", updateError);
        } else {
          console.log(`[CAKTO] Plan updated to lifetime ✓`);
        }
      } else {
        // Insert new plan
        const { error: insertError } = await supabaseAdmin
          .from("user_plans")
          .insert({
            user_id: userId,
            plan_type: "vitalicio",
            status: "active",
            expires_at: null,
          });

        if (insertError) {
          console.error("[CAKTO] Error inserting plan:", insertError);
        } else {
          console.log(`[CAKTO] Plan created ✓`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Email já existente - plano atualizado para vitalício",
        email: email,
        user_id: userId,
        plan_type: "vitalicio",
        is_new_user: false
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create NEW user
    console.log(`[CAKTO] Creating NEW user: ${email}`);
    console.log(`[CAKTO] Password: ${DEFAULT_PASSWORD}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: name },
    });

    if (createError) {
      console.error("[CAKTO] ERROR creating user:", createError);
      throw createError;
    }

    userId = newUser.user.id;
    console.log(`[CAKTO] User created: ${userId} ✓`);

    // Create profile manually (don't rely on trigger)
    console.log('[CAKTO] Creating profile...');
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        email: email,
        name: name,
        email_changed: false,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.error("[CAKTO] Error creating profile:", profileError);
    } else {
      console.log(`[CAKTO] Profile created ✓`);
    }

    // Create lifetime plan
    console.log('[CAKTO] Creating lifetime plan...');
    const { error: planError } = await supabaseAdmin
      .from("user_plans")
      .insert({
        user_id: userId,
        plan_type: "vitalicio",
        status: "active",
        expires_at: null,
      });

    if (planError) {
      console.error("[CAKTO] Error creating plan:", planError);
    } else {
      console.log(`[CAKTO] Lifetime plan created ✓`);
    }

    console.log('[CAKTO] ========== SUCCESS ==========');
    console.log(`[CAKTO] Account created: ${email} / ${DEFAULT_PASSWORD}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Conta criada com sucesso",
      email: email,
      password: DEFAULT_PASSWORD,
      user_id: userId,
      plan_type: "vitalicio",
      is_new_user: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[CAKTO] ========== ERROR ==========");
    console.error("[CAKTO] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
