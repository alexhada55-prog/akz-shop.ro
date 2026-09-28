import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";

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

const ICONS = ["sponge", "brush", "palette", "giftbox", "hoodie", "tee", "bluza", "cap", "pants", "jacket", "acc"];
const IMG_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/;

// Acceptă doar câmpurile așteptate; orice altceva este ignorat.
function clean(list) {
  if (!Array.isArray(list) || list.length > 300) return null;
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) return null;
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) return null;
    if (!Number.isInteger(p.id) || p.id < 1 || seen.has(p.id)) return null;
    seen.add(p.id);
    const sizes = (Array.isArray(p.sizes) ? p.sizes : [])
      .map((s) => String(s).trim().slice(0, 20)).filter(Boolean).slice(0, 12);
    out.push({
      id: p.id,
      name: p.name.trim().slice(0, 120),
      price,
      cat: String(p.cat || "Altele").slice(0, 40),
      tag: p.tag === "Nou" || p.tag === "Promoție" ? p.tag : null,
      icon: ICONS.includes(p.icon) ? p.icon : "giftbox",
      sizes: sizes.length ? sizes : ["Unică"],
      desc: typeof p.desc === "string" ? p.desc.trim().slice(0, 1500) : "",
      specs: (Array.isArray(p.specs) ? p.specs : [])
        .filter((x) => x && typeof x.k === "string" && typeof x.v === "string" && x.k.trim() && x.v.trim())
        .slice(0, 12).map((x) => ({ k: x.k.trim().slice(0, 40), v: x.v.trim().slice(0, 120) })),
      img: typeof p.img === "string" && p.img.length < 300000 && IMG_RE.test(p.img) ? p.img : null,
    });
  }
  return out;
}

export default async (req) => {
  const store = getStore("akz-shop");

  if (req.method === "GET") {
    const products = await store.get("list", { type: "json" });
    return json({ products: products ?? null });
  }

  if (req.method === "PUT") {
    if (!isAdmin(req)) return json({ error: "unauthorized" }, 401);
    const text = await req.text();
    if (text.length > 5500000) return json({ error: "too large" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "bad request" }, 400); }
    const products = clean(body.products);
    if (!products) return json({ error: "invalid products" }, 400);
    await store.setJSON("list", products);
    return json({ ok: true, count: products.length });
  }

  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/products" };
