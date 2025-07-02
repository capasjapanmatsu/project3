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

// Generate a PIN code for a smart lock
async function generatePinCode(
  userId: string,
  lockId: string,
  purpose: 'entry' | 'exit' = 'entry',
  expiryMinutes: number = 5,
  ticketType: string = 'subscription',
  reservationId: string | null = null,
  reservationType: string = 'regular',
  startTime?: string,
  endTime?: string
) {
  try {
    // Get the smart lock details
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select("*")
      .eq("lock_id", lockId)
      .single();
    
    if (lockError) throw lockError;
    
    if (!lock) {
      throw new Error("Smart lock not found");
    }
    
    // Check if PIN is enabled for this lock
    if (!lock.pin_enabled) {
      throw new Error("PIN access is not enabled for this lock");
    }
    
    // Check if user has access to this park (subscription, oneday, or reservation)
    const { data: accessData, error: accessError } = await supabase.rpc("check_user_park_access", {
      p_user_id: userId,
      p_lock_id: lockId
    });
    
    if (accessError) throw accessError;
    
    if (!accessData || !accessData.has_access) {
      // 決済が必要な場合の詳細なエラーメッセージ
      if (accessData && accessData.payment_required) {
        throw new Error(`PAYMENT_REQUIRED: ${accessData.payment_message || '決済が必要です'}`);
      }
      throw new Error("You do not have access to this facility");
    }
    
    // Check for active entry (PIN reuse prevention)
    const { data: activeEntry, error: entryError } = await supabase
      .from("user_entry_exit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("lock_id", lockId)
      .eq("action", "entry")
      .is("exit_time", null)
      .order("pin_issued_at", { ascending: false })
      .limit(1);
    if (entryError) throw entryError;
    if (activeEntry && activeEntry.length > 0) {
      throw new Error("You already have an active PIN. Please exit before requesting a new one.");
    }
    
    // 有効期間の決定
    let pinStart = new Date();
    let pinEnd = new Date(pinStart.getTime() + expiryMinutes * 60000);
    if (reservationType === 'whole_facility' && startTime && endTime) {
      pinStart = new Date(startTime);
      pinEnd = new Date(endTime);
    }
    
    // Generate a random 6-digit PIN
    const pinCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the PIN for storage
    const pinHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pinCode))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      );

    // Store the PIN in the database
    const { error: insertError } = await supabase
      .from('smart_lock_pins')
      .insert({
        lock_id: lockId,
        user_id: userId,
        pin_code: pinCode,
        pin_hash: pinHash,
        purpose: purpose,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        is_used: false
      });

    if (insertError) {
      console.error('Failed to store PIN in database:', insertError);
      throw new Error('Failed to generate PIN');
    }

    // Log PIN issuance in user_entry_exit_logs
    await supabase.from("user_entry_exit_logs").insert({
      user_id: userId,
      park_id: lock.park_id,
      dog_ids: [],
      action: "entry",
      pin_code: pinCode,
      lock_id: lockId,
      pin_issued_at: pinStart.toISOString(),
      pin_expires_at: pinEnd.toISOString(),
      ticket_type: ticketType,
      reservation_id: reservationId
    });
    
    return {
      pin: pinCode,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lock_id: lockId,
      purpose: purpose
    };
  } catch (error) {
    console.error("Error generating PIN code:", error);
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
    const { lock_id, purpose = 'entry', expiry_minutes = 5, ticket_type = 'subscription', reservation_id = null, reservation_type = 'regular', start_time, end_time } = requestData;
    
    // Validate required parameters
    if (!lock_id) {
      throw new Error("Missing required parameter: lock_id");
    }
    
    // Generate the PIN code (pass ticketType and reservationId)
    const result = await generatePinCode(user.id, lock_id, purpose, expiry_minutes, ticket_type, reservation_id, reservation_type, start_time, end_time);
    
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