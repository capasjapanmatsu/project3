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

// Check the status of an identity verification session
async function checkIdentityVerification(verificationId: string) {
  try {
    // Get the verification session from Stripe
    const verificationSession = await stripe.identity.verificationSessions.retrieve(verificationId);
    
    // Get the user ID from the database
    const { data: verification, error: verificationError } = await supabase
      .from("owner_verifications")
      .select("user_id, status")
      .eq("verification_id", verificationId)
      .single();
    
    if (verificationError) throw verificationError;
    
    // Update the verification status in the database
    const { error: updateError } = await supabase
      .from("owner_verifications")
      .update({
        status: verificationSession.status,
        verification_data: verificationSession,
        updated_at: new Date().toISOString()
      })
      .eq("verification_id", verificationId);
    
    if (updateError) throw updateError;
    
    // If the verification is verified, update the user's profile
    if (verificationSession.status === "verified" && verification.status !== "verified") {
      // Update the user's profile to indicate they are verified
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          user_type: "owner"
        })
        .eq("id", verification.user_id);
      
      if (profileError) throw profileError;
    }
    
    return {
      status: verificationSession.status,
      last_error: verificationSession.last_error,
      last_verification_report: verificationSession.last_verification_report
    };
  } catch (error) {
    console.error("Error checking identity verification:", error);
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
    const { verificationId } = requestData;
    
    // Validate required parameters
    if (!verificationId) {
      throw new Error("Missing required parameter: verificationId");
    }
    
    // Check the verification status
    const result = await checkIdentityVerification(verificationId);
    
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