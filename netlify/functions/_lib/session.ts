import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const COOKIE_NAME = 'dpjp_session';

function getSecret(): Uint8Array {
  const secret = (process.env.SESSION_SECRET || process.env.LINE_SESSION_SECRET) as string | undefined;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: { sid: string; uid: string }, ttlSeconds = 60 * 60 * 12): Promise<string> {
  const secret = getSecret();
  const jwt = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
  return jwt;
}

export async function verifySessionToken(token: string): Promise<JWTPayload & { sid?: string; uid?: string }> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as JWTPayload & { sid?: string; uid?: string };
}

export function buildSessionCookie(token: string, maxAgeSec = 60 * 60 * 12): string {
  // Domain は apex とサブドメイン双方で使えるように親ドメインを指定
  const domain = process.env.COOKIE_DOMAIN || 'dogparkjp.com';
  // 2枚設定: ドメイン指定 と ドメイン未指定（サブドメインによりCookie制約が異なる対策）
  const base = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAgeSec}`;
  const withDomain = `${COOKIE_NAME}=${token}; Path=/; Domain=.${domain}; HttpOnly; Secure; SameSite=None; Max-Age=${maxAgeSec}`;
  // Netlify Functions は単一のヘッダー値しか返せないため、呼び出し側が必要に応じて2枚返す設計に切替えるのが理想だが、
  // ここでは後方互換のためドメイン指定側を返す
  return withDomain;
}

export function buildClearCookie(): string {
  const domain = process.env.COOKIE_DOMAIN || 'dogparkjp.com';
  return `${COOKIE_NAME}=; Path=/; Domain=.${domain}; HttpOnly; Secure; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function readCookie(headers: Record<string, string | undefined>): string | undefined {
  const cookieHeader = headers['cookie'] || headers['Cookie'];
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === COOKIE_NAME) return v;
  }
  return undefined;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;


