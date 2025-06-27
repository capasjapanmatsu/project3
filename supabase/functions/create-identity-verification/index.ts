import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@12.4.0";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Handle preflight OPTIONS request
function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }
  return null;
}

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

// Create an identity verification session
async function createIdentityVerification(userId: string, returnUrl: string) {
  try {
    // Check if the user already has a verification session
    const { data: existingVerification, error: verificationError } = await supabase
      .from("owner_verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (verificationError && verificationError.code !== 'PGRST116') {
      throw verificationError;
    }
    
    // If there's an existing verification that's already verified, return it
    if (existingVerification && existingVerification.status === "verified") {
      return {
        id: existingVerification.verification_id,
        url: null,
        status: "verified"
      };
    }
    
    // Create a new verification session with Stripe
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: userId
      },
      return_url: returnUrl,
      options: {
        document: {
          allowed_types: ["driving_license", "passport", "id_card"],
          require_matching_selfie: true,
        },
        supported_countries: ["JP", "US", "GB", "CA", "AU", "SG"],
      },
    });
    
    // Save the verification session in the database
    if (existingVerification) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("owner_verifications")
        .update({
          verification_id: verificationSession.id,
          status: "pending",
          verification_data: verificationSession,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      
      if (updateError) throw updateError;
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from("owner_verifications")
        .insert({
          user_id: userId,
          verification_id: verificationSession.id,
          status: "pending",
          verification_data: verificationSession
        });
      
      if (insertError) throw insertError;
    }
    
    return {
      id: verificationSession.id,
      url: verificationSession.url,
      status: verificationSession.status
    };
  } catch (error) {
    console.error("Error creating identity verification:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Get the request body
    const requestData = await req.json();
    
    // Get the user ID from the authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }
    
    // Extract parameters from the request
    const { returnUrl = `${req.headers.get("origin") || ""}/register-park` } = requestData;
    
    // Create the identity verification session
    const result = await createIdentityVerification(user.id, returnUrl);
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});