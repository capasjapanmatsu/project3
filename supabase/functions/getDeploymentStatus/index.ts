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

// Get deployment status from Netlify
async function getDeploymentStatus(userId: string, deployId: string | undefined, netlifyApiKey: string) {
  try {
    // If no deployId is provided, get the latest deployment
    if (!deployId) {
      const { data: latestDeploy, error: dbError } = await supabase
        .from("deployments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbError) {
        throw new Error(`Failed to get latest deployment: ${dbError.message}`);
      }

      if (!latestDeploy) {
        return {
          deploy_url: "https://dogparkjp.com",
          owner: "user"
        };
      }

      deployId = latestDeploy.deploy_id;
      
      // If we have a site_id and deploy_id, check the status on Netlify
      if (latestDeploy.site_id && deployId) {
        const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${latestDeploy.site_id}/deploys/${deployId}`, {
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
        
        // Update the status in the database
        await supabase
          .from("deployments")
          .update({
            status: statusData.state,
            deploy_url: statusData.deploy_ssl_url || statusData.deploy_url,
          })
          .eq("deploy_id", deployId);

        return {
          deploy_url: statusData.deploy_ssl_url || statusData.deploy_url,
          status: statusData.state,
          owner: "user"
        };
      }

      return {
        deploy_url: latestDeploy.deploy_url,
        status: latestDeploy.status,
        owner: "user"
      };
    }

    // If deployId is provided, get the deployment from the database
    const { data: deploy, error: deployError } = await supabase
      .from("deployments")
      .select("*")
      .eq("deploy_id", deployId)
      .maybeSingle();

    if (deployError) {
      throw new Error(`Failed to get deployment: ${deployError.message}`);
    }

    if (!deploy) {
      throw new Error("Deployment not found");
    }

    // Check the status on Netlify
    const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${deploy.site_id}/deploys/${deployId}`, {
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
    
    // Update the status in the database
    await supabase
      .from("deployments")
      .update({
        status: statusData.state,
        deploy_url: statusData.deploy_ssl_url || statusData.deploy_url,
      })
      .eq("deploy_id", deployId);

    return {
      deploy_url: statusData.deploy_ssl_url || statusData.deploy_url,
      status: statusData.state,
      owner: "user"
    };
  } catch (error) {
    console.error("Error getting deployment status:", error);
    return {
      deploy_url: "https://dogparkjp.com",
      owner: "user"
    };
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
    const { id, netlifyApiKey } = requestData;

    // Validate Netlify API key
    if (!netlifyApiKey) {
      throw new Error("Netlify API key is required");
    }

    // Get deployment status
    const result = await getDeploymentStatus(user.id, id, netlifyApiKey);

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
        deploy_url: "https://dogparkjp.com",
        owner: "user"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200, // Return 200 even on error to avoid breaking the UI
      }
    );
  }
});