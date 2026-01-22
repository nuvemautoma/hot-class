import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-cakto-secret",
};

// Cakto webhook secret for validation
const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

interface CaktoPayload {
  // Cakto webhook payload fields - all possible email fields
  email?: string;
  buyer_email?: string;
  customer_email?: string;
  cliente_email?: string;
  // Product info (not used anymore, always vitalicio)
  product_name?: string;
  product_id?: string;
  offer_name?: string;
  // Transaction info
  transaction_id?: string;
  sale_id?: string;
  // Event info
  status?: string;
  event?: string;
  type?: string;
  action?: string;
  // Secret fields
  webhook_secret?: string;
  secret?: string;
  // Any other fields
  [key: string]: unknown;
}

// Event types that should delete the user
const DELETE_EVENTS = [
  'refund',
  'refunded',
  'reembolso',
  'chargeback',
  'subscription_cancelled',
  'subscription_canceled',
  'assinatura_cancelada',
  'payment_failed',
  'pagamento_falhou',
  'cancelled',
  'canceled',
  'cancelado',
  'expired',
  'expirado',
];

// Event types that should create/update the user
const APPROVED_EVENTS = [
  'approved',
  'paid',
  'payment_approved',
  'pagamento_aprovado',
  'aprovado',
  'completed',
  'success',
  'active',
  'ativo',
  'confirmed',
  'confirmado',
];

// Determine the event type from payload
function getEventType(payload: CaktoPayload): 'create' | 'delete' | 'unknown' {
  const event = (payload.event || payload.type || payload.action || payload.status || '').toLowerCase().trim();
  
  console.log(`[CAKTO] Raw event value: "${event}"`);
  console.log(`[CAKTO] Checking against DELETE_EVENTS: ${DELETE_EVENTS.join(', ')}`);
  console.log(`[CAKTO] Checking against APPROVED_EVENTS: ${APPROVED_EVENTS.join(', ')}`);
  
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

// Extract email from various possible fields
function extractEmail(payload: CaktoPayload): string | null {
  const possibleFields = ['email', 'buyer_email', 'customer_email', 'cliente_email'];
  
  for (const field of possibleFields) {
    const value = payload[field];
    if (typeof value === 'string' && value.includes('@')) {
      console.log(`[CAKTO] Found email in field "${field}": ${value}`);
      return value.toLowerCase().trim();
    }
  }
  
  // Try to find email in any field
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
      console.log(`[CAKTO] Found email in unexpected field "${key}": ${value}`);
      return value.toLowerCase().trim();
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  console.log('[CAKTO] ========== WEBHOOK RECEIVED ==========');
  console.log(`[CAKTO] Method: ${req.method}`);
  console.log(`[CAKTO] URL: ${req.url}`);
  
  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log('[CAKTO] Handling CORS preflight');
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
    try {
      const rawBody = await req.text();
      console.log(`[CAKTO] Raw body received: ${rawBody.substring(0, 500)}${rawBody.length > 500 ? '...' : ''}`);
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[CAKTO] ERROR: Failed to parse JSON body:', parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("[CAKTO] Parsed payload:", JSON.stringify(payload, null, 2));

    // Validate webhook secret if configured
    if (CAKTO_WEBHOOK_SECRET) {
      const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-cakto-secret");
      const payloadSecret = payload.webhook_secret || payload.secret;
      const receivedSecret = headerSecret || payloadSecret;

      console.log(`[CAKTO] Secret configured: YES`);
      console.log(`[CAKTO] Header secret received: ${headerSecret ? 'YES' : 'NO'}`);
      console.log(`[CAKTO] Payload secret received: ${payloadSecret ? 'YES' : 'NO'}`);

      if (receivedSecret !== CAKTO_WEBHOOK_SECRET) {
        console.error("[CAKTO] ERROR: Invalid webhook secret!");
        console.error(`[CAKTO] Expected: ${CAKTO_WEBHOOK_SECRET.substring(0, 8)}...`);
        console.error(`[CAKTO] Received: ${receivedSecret ? receivedSecret.substring(0, 8) + '...' : 'NONE'}`);
        return new Response(JSON.stringify({ error: "Unauthorized - Invalid webhook secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[CAKTO] Webhook secret validated successfully ✓");
    } else {
      console.log("[CAKTO] WARNING: No webhook secret configured, accepting all requests");
    }

    // Extract email
    const email = extractEmail(payload);
    
    if (!email) {
      console.error("[CAKTO] ERROR: No email found in payload!");
      console.error("[CAKTO] Payload keys:", Object.keys(payload));
      return new Response(JSON.stringify({ error: "Email is required - no email found in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[CAKTO] Email extracted: ${email}`);
    
    // Determine event type
    const eventType = getEventType(payload);
    console.log(`[CAKTO] Event type determined: ${eventType}`);

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

    // Find existing user
    console.log(`[CAKTO] Looking for existing user with email: ${email}`);
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("[CAKTO] ERROR listing users:", listError);
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );
    
    console.log(`[CAKTO] Existing user found: ${existingUser ? 'YES (ID: ' + existingUser.id + ')' : 'NO'}`);

    // Handle DELETE events
    if (eventType === 'delete') {
      if (!existingUser) {
        console.log(`[CAKTO] User not found for deletion, nothing to do`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "User not found, nothing to delete",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const userId = existingUser.id;
      console.log(`[CAKTO] DELETING user: ${userId} (${email})`);

      // Delete all related data
      const tables = ['user_plans', 'profiles', 'authorized_ips', 'user_roles', 'user_group_unlocks', 'user_terms_acceptance', 'password_reset_codes', 'ip_unlock_slots'];
      
      for (const table of tables) {
        const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
        if (error) {
          console.error(`[CAKTO] Error deleting from ${table}:`, error.message);
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

      console.log(`[CAKTO] User ${userId} completely deleted ✓`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "User deleted successfully",
          user_id: userId,
          event: eventType,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle CREATE events - ALWAYS create lifetime plan
    console.log(`[CAKTO] Processing CREATE event - will create LIFETIME plan`);

    let userId: string;

    if (existingUser) {
      // User exists - just update their plan to active lifetime
      userId = existingUser.id;
      console.log(`[CAKTO] User exists: ${userId}, updating to active lifetime plan`);
      
      // Upsert the plan - always set to vitalicio/active
      const { error: planError } = await supabaseAdmin
        .from("user_plans")
        .upsert({
          user_id: userId,
          plan_type: "vitalicio",
          status: "active",
          expires_at: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (planError) {
        console.error("[CAKTO] Error updating plan:", planError);
        throw planError;
      }

      console.log(`[CAKTO] Plan updated to LIFETIME for existing user ✓`);
    } else {
      // Create new user with default password
      const defaultPassword = "SUPORTE10#";
      
      console.log(`[CAKTO] Creating NEW user: ${email}`);
      console.log(`[CAKTO] Default password: ${defaultPassword}`);
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: {
          name: email.split("@")[0],
        },
      });

      if (createError) {
        console.error("[CAKTO] ERROR creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`[CAKTO] New user created: ${userId} ✓`);

      // Wait for trigger to create profile
      console.log('[CAKTO] Waiting 500ms for profile trigger...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create lifetime plan
      console.log('[CAKTO] Creating LIFETIME plan...');
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
        // Don't throw - user was created successfully
      } else {
        console.log(`[CAKTO] Lifetime plan created for new user ✓`);
      }
    }

    console.log('[CAKTO] ========== WEBHOOK COMPLETED SUCCESSFULLY ==========');

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser ? "Plan updated to lifetime" : "User created with lifetime plan",
        user_id: userId,
        email: email,
        plan_type: "vitalicio",
        expires_at: null,
        event: eventType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[CAKTO] ========== WEBHOOK ERROR ==========");
    console.error("[CAKTO] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
