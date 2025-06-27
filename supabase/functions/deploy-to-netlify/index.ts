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

// Deploy to Netlify
async function deployToNetlify(
  userId: string,
  buildCommand: string,
  outputDir: string,
  netlifyApiKey: string,
  siteId?: string,
  deployId?: string
) {
  try {
    // If we're checking status of an existing deployment
    if (siteId && deployId) {
      const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${netlifyApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to get deployment status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      return {
        site_id: siteId,
        deploy_id: deployId,
        status: statusData.state,
        deploy_url: statusData.deploy_ssl_url || statusData.deploy_url,
        claimed: statusData.site_capabilities?.claimed || false,
        claim_url: statusData.site_capabilities?.claimed ? null : `https://app.netlify.com/sites/${statusData.name}/deploys/${deployId}`
      };
    }

    // Create a new deployment
    const response = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${netlifyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `dogparkjp-${userId.substring(0, 8)}`,
        build_settings: {
          cmd: buildCommand,
          dir: outputDir,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create site: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the deployment in the database
    await supabase.from("deployments").insert({
      user_id: userId,
      site_id: data.id,
      site_name: data.name,
      deploy_id: data.deploy_id,
      status: data.state || "created",
      deploy_url: data.ssl_url || data.url,
    });

    return {
      site_id: data.id,
      deploy_id: data.deploy_id,
      status: data.state || "created",
      deploy_url: data.ssl_url || data.url,
      claimed: data.claimed || false,
      claim_url: data.claimed ? null : `https://app.netlify.com/sites/${data.name}/overview`
    };
  } catch (error) {
    console.error("Error deploying to Netlify:", error);
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
    const { 
      buildCommand = "npm run build", 
      outputDir = "dist", 
      siteId, 
      deployId,
      netlifyApiKey
    } = requestData;

    // Validate Netlify API key
    if (!netlifyApiKey) {
      throw new Error("Netlify API key is required");
    }

    // Deploy to Netlify
    const result = await deployToNetlify(
      user.id,
      buildCommand,
      outputDir,
      netlifyApiKey,
      siteId,
      deployId
    );

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