import { createHmac, timingSafeEqual } from "node:crypto";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secret = Netlify.env.get("SESSION_SECRET");
  const adminPassword = Netlify.env.get("ADMIN_PASSWORD");
  if (!secret || !adminPassword) return json({ error: "not configured" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad request" }, 400); }

  // Comparăm hash-uri de aceeași lungime, în timp constant.
  const digest = (v) => createHmac("sha256", secret).update(String(v ?? "")).digest();
  if (!timingSafeEqual(digest(body.password), digest(adminPassword))) {
    await new Promise((r) => setTimeout(r, 800)); // încetinește încercările repetate
    return json({ error: "unauthorized" }, 401);
  }

  const exp = String(Date.now() + 8 * 60 * 60 * 1000); // sesiune de 8 ore
  const sig = createHmac("sha256", secret).update("admin." + exp).digest("hex");
  return json({ token: exp + "." + sig });
};

export const config = { path: "/api/login" };
