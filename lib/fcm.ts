// إرسال إشعارات Firebase Cloud Messaging (HTTP v1) من السيرفر
// يوقّع JWT بمفتاح حساب الخدمة → يبدّله بـ access token → يرسل. بلا مكتبات إضافية.
import "server-only";
import crypto from "node:crypto";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

export const fcmConfigured = !!(PROJECT_ID && CLIENT_EMAIL && PRIVATE_KEY);

let cached: { token: string; exp: number } | null = null;

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

async function getAccessToken(): Promise<string | null> {
  if (!fcmConfigured) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(PRIVATE_KEY).toString("base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  cached = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cached.token;
}

// يرسل لكل رمز؛ يعيد عدد المُرسَل وقائمة الرموز غير الصالحة (لحذفها)
export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  link?: string
): Promise<{ sent: number; invalid: string[] }> {
  const invalid: string[] = [];
  if (!tokens.length) return { sent: 0, invalid };
  const access = await getAccessToken();
  if (!access) return { sent: 0, invalid };

  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            webpush: {
              notification: { title, body, icon: "/icon-192.png" },
              fcmOptions: link ? { link } : undefined,
            },
          },
        }),
      });
      if (res.ok) sent++;
      else {
        const err = await res.json().catch(() => ({}));
        const status = err?.error?.status;
        if (status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") invalid.push(token);
      }
    })
  );
  return { sent, invalid };
}
