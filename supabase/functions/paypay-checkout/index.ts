import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { HMAC } from "npm:@noble/hashes@1.3.2/hmac";
import { sha256 } from "npm:@noble/hashes@1.3.2/sha256";
import { base64 } from "npm:@stablelib/base64@1.0.1";

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

// PayPay API configuration
const PAYPAY_API_KEY = Deno.env.get("PAYPAY_API_KEY") || "a_FCpsFOALxH_HZnB";
const PAYPAY_SECRET_KEY = Deno.env.get("PAYPAY_SECRET_KEY") || "bnet5DYTjTJ75I8wE8PQkGW3V1ciW4q8EVd6WKunnA8=";
const PAYPAY_MERCHANT_ID = Deno.env.get("PAYPAY_MERCHANT_ID") || "927395976683495424";
const PAYPAY_API_URL = "https://stg-api.paypay.ne.jp"; // Staging URL

// Generate a unique ID for the payment
function generateMerchantPaymentId() {
  return `payment_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

// Generate HMAC signature for PayPay API
function generateHmacSignature(method: string, url: string, body: string, timestamp: string) {
  const contentType = "application/json";
  const requestBody = body || "";
  
  const hmacMessage = [method, url, timestamp, contentType, requestBody].join("\n");
  
  const hmac = new HMAC(sha256, base64.decode(PAYPAY_SECRET_KEY));
  const signature = base64.encode(hmac.update(new TextEncoder().encode(hmacMessage)).digest());
  
  return signature;
}

// Create a checkout session with PayPay
async function createPayPayCheckout(
  userId: string,
  amount: number,
  orderDescription: string,
  successUrl: string,
  cancelUrl: string,
  isMiniApp: boolean = false,
  customParams: Record<string, any> = {},
  cartItems?: string[],
  shippingInfo?: {
    name?: string;
    address?: string;
    postal_code?: string;
    phone?: string;
  },
  notes?: string,
  orderNumber?: string
) {
  try {
    // Generate a unique merchant payment ID
    const merchantPaymentId = generateMerchantPaymentId();
    
    // Current timestamp in ISO format
    const timestamp = new Date().toISOString();
    
    // Prepare the request path
    const requestPath = "/v2/payments";
    const requestUrl = `${PAYPAY_API_URL}${requestPath}`;
    
    // Prepare the request body - using Native Payment API format
    const requestBody = {
      merchantPaymentId,
      amount: {
        amount,
        currency: "JPY"
      },
      orderDescription,
      redirectUrl: successUrl,
      redirectType: "WEB_LINK",
      userAgent: "Mozilla/5.0",
      codeType: "ORDER_QR",
      merchantRedirectUrl: successUrl,
      merchantCancelUrl: cancelUrl,
      isAuthorization: false,
      requestedAt: timestamp,
      storeId: "dogparkjp-store",
      terminalId: "dogparkjp-terminal",
      orderReceiptNumber: orderNumber || merchantPaymentId,
      metadata: {
        userId,
        isMiniApp,
        ...customParams
      }
    };
    
    // Generate HMAC signature
    const signature = generateHmacSignature(
      "POST",
      requestPath,
      JSON.stringify(requestBody),
      timestamp
    );
    
    console.log("Making request to PayPay API:", requestUrl);
    console.log("Request body:", JSON.stringify(requestBody));
    
    // Make the request to PayPay API
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PAYPAY-API-VERSION": "v2",
        "Authorization": `hmac OPA-Auth:${PAYPAY_API_KEY}:${signature}`,
        "X-PAYPAY-TIMESTAMP": timestamp,
        "X-PAYPAY-REQUEST-ID": merchantPaymentId,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log("PayPay API response status:", response.status);
    const responseData = await response.json();
    console.log("PayPay API response:", JSON.stringify(responseData));
    
    if (!response.ok) {
      console.error("PayPay API error:", responseData);
      throw new Error(responseData.message || "PayPay API error");
    }
    
    // Store payment information in the database
    const { error: paymentError } = await supabase
      .from("paypay_payments")
      .insert({
        user_id: userId,
        merchant_payment_id: merchantPaymentId,
        amount,
        currency: "JPY",
        status: "pending",
        payment_data: responseData,
      });
    
    if (paymentError) {
      console.error("Error storing payment information:", paymentError);
    }
    
    // If cart items are provided, process them
    if (cartItems && cartItems.length > 0) {
      // Create an order
      const { data: orderData, error: orderError } = await supabase.rpc("create_order_from_cart", {
        p_user_id: userId,
        p_cart_items: cartItems,
        p_payment_method: "paypay",
        p_shipping_name: shippingInfo?.name || "",
        p_shipping_address: shippingInfo?.address || "",
        p_shipping_postal_code: shippingInfo?.postal_code || "",
        p_shipping_phone: shippingInfo?.phone || "",
        p_notes: notes || "",
        p_order_number: orderNumber || `DP${Date.now()}${Math.floor(Math.random() * 1000)}`
      });
      
      if (orderError) {
        console.error("Error creating order:", orderError);
      } else if (orderData && orderData.order_id) {
        // Update the payment with the order ID
        const { error: updateError } = await supabase
          .from("paypay_payments")
          .update({ order_id: orderData.order_id })
          .eq("merchant_payment_id", merchantPaymentId);
        
        if (updateError) {
          console.error("Error updating payment with order ID:", updateError);
        }
      }
    }
    
    return {
      url: responseData.data.url,
      merchantPaymentId,
    };
  } catch (error) {
    console.error("Error creating PayPay checkout:", error);
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
      amount,
      orderDescription,
      success_url = `${req.headers.get("origin")}/payment-confirmation?success=true`,
      cancel_url = `${req.headers.get("origin")}/payment-confirmation?canceled=true`,
      is_mini_app = false,
      cart_items,
      shipping_name,
      shipping_address,
      shipping_postal_code,
      shipping_phone,
      notes,
      order_number,
      ...customParams
    } = requestData;
    
    // Validate required parameters
    if (!amount || !orderDescription) {
      throw new Error("Missing required parameters: amount and orderDescription");
    }
    
    console.log("Creating PayPay checkout with params:", {
      userId: user.id,
      amount,
      orderDescription,
      successUrl: success_url,
      cancelUrl: cancel_url,
      isMiniApp: is_mini_app,
      customParams,
      cartItems: cart_items,
      shippingInfo: {
        name: shipping_name,
        address: shipping_address,
        postal_code: shipping_postal_code,
        phone: shipping_phone,
      },
      notes,
      orderNumber: order_number
    });
    
    // Create the checkout session
    const checkoutResult = await createPayPayCheckout(
      user.id,
      amount,
      orderDescription,
      success_url,
      cancel_url,
      is_mini_app,
      customParams,
      cart_items,
      {
        name: shipping_name,
        address: shipping_address,
        postal_code: shipping_postal_code,
        phone: shipping_phone,
      },
      notes,
      order_number
    );
    
    console.log("PayPay checkout created successfully:", checkoutResult);
    
    // Return the checkout URL
    return new Response(
      JSON.stringify(checkoutResult),
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