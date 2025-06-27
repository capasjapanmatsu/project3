import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

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

// Verify JWS token from PayPay
async function verifyPayPayJWS(jws: string, userId: string) {
  try {
    // In a real implementation, we would verify the JWS signature
    // For demo purposes, we'll extract the UAID from the JWS payload
    
    // Split the JWS into header, payload, and signature
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWS format");
    }
    
    // Decode the payload (base64url to JSON)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Extract the UAID from the payload
    const uaid = payload.uaid || "demo_uaid_123456789";
    
    // Check if this UAID is already linked to a user
    const { data: existingLink, error: linkError } = await supabase
      .from("paypay_user_links")
      .select("*")
      .eq("uaid", uaid)
      .maybeSingle();
    
    if (linkError && linkError.code !== 'PGRST116') {
      throw linkError;
    }
    
    // If the UAID is already linked to this user, return success
    if (existingLink && existingLink.user_id === userId) {
      return {
        success: true,
        uaid,
        isLinked: true,
        token: jws
      };
    }
    
    // If the UAID is linked to another user, return error
    if (existingLink && existingLink.user_id !== userId) {
      throw new Error("This PayPay account is already linked to another user");
    }
    
    // Return the UAID for linking
    return {
      success: true,
      uaid,
      isLinked: false,
      token: jws
    };
  } catch (error) {
    console.error("Error verifying PayPay JWS:", error);
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
    const { jws, redirectUrl } = requestData;
    
    // Validate required parameters
    if (!jws) {
      throw new Error("Missing required parameter: jws");
    }
    
    // Verify the JWS
    const result = await verifyPayPayJWS(jws, user.id);
    
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