import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

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
    
    // Get product info for plan type
    const productName = payload.product_name || payload.offer_name;
    const productId = payload.product_id;
    const planType = getPlanType(productName, productId);
    const expirationDate = getExpirationDate(planType);
    
    console.log(`Processing: email=${normalizedEmail}, plan=${planType}, expires=${expirationDate}`);

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

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

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
