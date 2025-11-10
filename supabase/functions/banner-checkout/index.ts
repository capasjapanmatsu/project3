// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://dogparkjp.com";

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

type Body = { months?: number; slot?: number; preview?: boolean };

const getUserCount = async (): Promise<number> => {
  // profiles が一般的。無ければ auth.users を試す
  try {
    const { count, error } = await supa.from("profiles").select("*", { count: "exact", head: true });
    if (!error && typeof count === "number") return count;
  } catch {}
  try {
    const { count, error } = await supa.auth.admin.listUsers({ page: 1, perPage: 1 }) as any;
    if (!error && typeof count === "number") return count;
  } catch {}
  return 0;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }
    const body = (await req.json().catch(() => ({}))) as Body;
    const months = Math.max(1, Math.min(Number(body.months || 1), 24));
    const slot = Math.max(1, Math.min(Number(body.slot || 1), 10));
    const preview = Boolean(body.preview);

    // 認証ユーザー
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: uerr } = await supa.auth.getUser(jwt);
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // 価格計算（月）: 3,000 + ユーザー数 × 30（非表示ロジック）
    const userCount = await getUserCount();
    const monthly = 3000 + (userCount * 30);
    // 割引（表示は控えめに。サーバ側のみ適用）
    let discountRate = 0;
    if (months >= 12) discountRate = 0.2;
    else if (months >= 6) discountRate = 0.1;
    else if (months >= 3) discountRate = 0.05;
    const subtotal = monthly * months;
    const total = Math.round(subtotal * (1 - discountRate));

    if (preview) {
      return new Response(JSON.stringify({ monthly, discountRate, subtotal, total }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${APP_BASE_URL}/payment-confirmation?success=true&type=banner`,
      cancel_url: `${APP_BASE_URL}/payment-confirmation?canceled=true&type=banner`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: total,
          product_data: {
            name: `ホームスライドバナー 枠${slot} / ${months}カ月`,
          }
        }
      }],
      metadata: {
        product: "banner",
        user_id: user.id,
        slot: String(slot),
        months: String(months),
        user_count: String(userCount),
        monthly: String(monthly),
        discount_rate: String(discountRate),
      }
    });

    // 事前にオーダーを仮作成してもよいが、ここではWebhookで本登録
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


