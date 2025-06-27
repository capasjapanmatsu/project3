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

// Link PayPay account to user
async function linkPayPayAccount(userId: string, uaid: string) {
  try {
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
        message: "PayPay account already linked to this user"
      };
    }
    
    // If the UAID is linked to another user, return error
    if (existingLink && existingLink.user_id !== userId) {
      throw new Error("This PayPay account is already linked to another user");
    }
    
    // Link the UAID to the user
    const { error: insertError } = await supabase
      .from("paypay_user_links")
      .insert({
        user_id: userId,
        uaid,
        linked_at: new Date().toISOString()
      });
    
    if (insertError) {
      throw insertError;
    }
    
    return {
      success: true,
      message: "PayPay account linked successfully"
    };
  } catch (error) {
    console.error("Error linking PayPay account:", error);
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
    const { uaid } = requestData;
    
    // Validate required parameters
    if (!uaid) {
      throw new Error("Missing required parameter: uaid");
    }
    
    // Link the PayPay account
    const result = await linkPayPayAccount(user.id, uaid);
    
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