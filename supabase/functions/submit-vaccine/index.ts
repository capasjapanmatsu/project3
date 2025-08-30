import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      // CLIの制約で SUPABASE_ プレフィックスは使えないため、PROJECT_URL/SERVICE_ROLE_KEY も見る
      Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "",
      // RLSを回避して確実に書き込む
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const { dog_id, rabies_url, combo_url, rabies_expiry, combo_expiry } = body || {};
    if (!dog_id) return new Response(JSON.stringify({ error: "dog_id is required" }), { status: 400, headers: corsHeaders });

    const payload: any = {
      dog_id,
      status: "pending",
    };
    if (rabies_url !== undefined) payload.rabies_vaccine_image = rabies_url;
    if (combo_url !== undefined) payload.combo_vaccine_image = combo_url;
    if (rabies_expiry !== undefined) payload.rabies_expiry_date = rabies_expiry;
    if (combo_expiry !== undefined) payload.combo_expiry_date = combo_expiry;

    // 再提出でも常に新規行として作成（created_atを新しくし、管理画面にも確実に出す）
    const { error: upsertErr } = await supabase
      .from("vaccine_certifications")
      .insert([payload]);
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e?.message || String(e) }), { status: 500, headers: corsHeaders });
  }
});


