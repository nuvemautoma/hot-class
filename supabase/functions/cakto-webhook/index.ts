import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// Cakto webhook secret for validation
const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

interface CaktoPayload {
  // Cakto webhook payload fields
  email?: string;
  buyer_email?: string;
  customer_email?: string;
  product_name?: string;
  product_id?: string;
  offer_name?: string;
  transaction_id?: string;
  sale_id?: string;
  status?: string;
  event?: string;
  // Event types from Cakto
  type?: string;
  action?: string;
  // Cakto may send secret in payload
  webhook_secret?: string;
  secret?: string;
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
];

// Map product names/IDs to plan types
function getPlanType(productName: string | undefined, productId: string | undefined): 'mensal' | 'trimestral' | 'vitalicio' {
  const name = (productName || '').toLowerCase();
  const id = (productId || '').toLowerCase();
  
  // Check for plan keywords in product name or ID
  if (name.includes('mensal') || name.includes('monthly') || id.includes('mensal')) {
    return 'mensal';
  }
  if (name.includes('trimestral') || name.includes('quarterly') || name.includes('3 meses') || id.includes('trimestral')) {
    return 'trimestral';
  }
  if (name.includes('vitalicio') || name.includes('vitalício') || name.includes('lifetime') || name.includes('anual') || id.includes('vitalicio')) {
    return 'vitalicio';
  }
  
  // Default to mensal if no match
  return 'mensal';
}

// Calculate expiration date based on plan type
function getExpirationDate(planType: 'mensal' | 'trimestral' | 'vitalicio'): Date | null {
  if (planType === 'vitalicio') {
    return null;
  }
  
  const now = new Date();
  if (planType === 'mensal') {
    now.setDate(now.getDate() + 30);
  } else if (planType === 'trimestral') {
    now.setDate(now.getDate() + 90);
  }
  
  return now;
}

// Determine the event type from payload
function getEventType(payload: CaktoPayload): 'create' | 'delete' | 'unknown' {
  const event = (payload.event || payload.type || payload.action || payload.status || '').toLowerCase();
  
  console.log(`Detecting event type from: "${event}"`);
  
  // Check if it's a delete event
  if (DELETE_EVENTS.some(e => event.includes(e))) {
    return 'delete';
  }
  
  // Check if it's a create/update event
  if (APPROVED_EVENTS.some(e => event.includes(e))) {
    return 'create';
  }
  
  // Default: treat as create for backward compatibility
  console.log('Event type unknown, defaulting to create');
  return 'create';
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: CaktoPayload = await req.json();
    
    console.log("Received Cakto webhook payload:", JSON.stringify(payload, null, 2));

    // Validate webhook secret
    // Cakto may send the secret in headers or in payload
    const headerSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-cakto-secret");
    const payloadSecret = payload.webhook_secret || payload.secret;
    const receivedSecret = headerSecret || payloadSecret;

    if (CAKTO_WEBHOOK_SECRET && receivedSecret !== CAKTO_WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Webhook secret validated successfully");

    // Extract email from various possible field names
    const email = payload.email || payload.buyer_email || payload.customer_email;
    
    if (!email) {
      console.error("No email found in payload");
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Determine event type
    const eventType = getEventType(payload);
    
    console.log(`Processing event: ${eventType} for email: ${normalizedEmail}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    // Handle DELETE events (refund, cancellation, payment failed)
    if (eventType === 'delete') {
      if (!existingUser) {
        console.log(`User not found for deletion: ${normalizedEmail}`);
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
      console.log(`Deleting user: ${userId} (${normalizedEmail})`);

      // Delete user plan first
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

      // Finally delete the auth user
      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (userDeleteError) {
        console.error("Error deleting auth user:", userDeleteError);
        throw userDeleteError;
      }

      console.log(`User completely deleted: ${userId}`);

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

    // Handle CREATE events (payment approved)
    // Get product info for plan type
    const productName = payload.product_name || payload.offer_name;
    const productId = payload.product_id;
    const planType = getPlanType(productName, productId);
    const expirationDate = getExpirationDate(planType);
    
    console.log(`Creating/updating: email=${normalizedEmail}, plan=${planType}, expires=${expirationDate}`);

    let userId: string;

    if (existingUser) {
      // User exists - update their plan
      userId = existingUser.id;
      console.log(`User already exists: ${userId}, updating plan`);
      
      // Upsert the plan
      const { error: planError } = await supabaseAdmin
        .from("user_plans")
        .upsert({
          user_id: userId,
          plan_type: planType,
          status: "active",
          expires_at: expirationDate?.toISOString() || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (planError) {
        console.error("Error updating plan:", planError);
        throw planError;
      }

      console.log(`Plan updated for existing user: ${userId}`);
    } else {
      // Create new user with default password
      const defaultPassword = "SUPORTE10#";
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: defaultPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: normalizedEmail.split("@")[0], // Use email prefix as name
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log(`New user created: ${userId}`);

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create user plan
      const { error: planError } = await supabaseAdmin
        .from("user_plans")
        .insert({
          user_id: userId,
          plan_type: planType,
          status: "active",
          expires_at: expirationDate?.toISOString() || null,
        });

      if (planError) {
        console.error("Error creating plan:", planError);
        // Don't throw - user was created, plan can be added later
      }

      console.log(`Plan created for new user: ${userId}, type: ${planType}`);
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser ? "Plan updated" : "User created",
        user_id: userId,
        plan_type: planType,
        expires_at: expirationDate?.toISOString() || null,
        event: eventType,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
