import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function isAdmin(req) {
  const secret = Netlify.env.get("SESSION_SECRET");
  if (!secret) return false;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  const expected = createHmac("sha256", secret).update("admin." + exp).digest("hex");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const IMG_RE = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+\/=]+)$/;

export default async (req) => {
  const store = getStore("akz-img");

  if (req.method === "GET") {
    const id = new URL(req.url).pathname.split("/").pop();
    if (!/^[a-z0-9]{8,32}$/.test(id)) return new Response("not found", { status: 404 });
    const rec = await store.get(id, { type: "json" });
    if (!rec) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(Buffer.from(rec.d, "base64")), {
      headers: { "Content-Type": rec.t, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  if (req.method === "POST") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    const text = await req.text();
    if (text.length > 900000) return json({ error: "too large" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "bad request" }, 400); }
    const m = IMG_RE.exec(typeof body.data === "string" ? body.data : "");
    if (!m) return json({ error: "invalid image" }, 400);
    const id = randomBytes(8).toString("hex");
    await store.setJSON(id, { t: m[1], d: m[2] });
    return json({ url: "/api/img/" + id });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: ["/api/img", "/api/img/*"] };
