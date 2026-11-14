import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, wajibRole, catat } from "./lib";

// Key-value: namaRT, alamatRT, ketua, sebutanKetua, bendahara, tagline, logoId, tpl_undangan, tpl_tagihan, tpl_kuitansi
async function semua(ctx: any) {
  const o: Record<string, string> = {};
  for (const r of await ctx.db.query("pengaturan").collect()) o[r.kunci] = r.nilai;
  if (o.logoId) { const u = await ctx.storage.getUrl(o.logoId); if (u) o.logoUrl = u; }
  return o;
}

// Tanpa token: hanya nama & logo, supaya layar masuk bisa menampilkan identitas RT
export const identitas = query({
  args: {},
  handler: async (ctx) => {
    const o = await semua(ctx);
    return { namaRT: o.namaRT ?? "", tagline: o.tagline ?? "", logoUrl: o.logoUrl ?? "" };
  },
});

export const ambil = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await getUser(ctx, token);
    return await semua(ctx);
  },
});

export const simpan = mutation({
  args: { token: v.string(), data: v.record(v.string(), v.string()) },
  handler: async (ctx, { token, data }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    const BOLEH = ["namaRT", "alamatRT", "ketua", "sebutanKetua", "bendahara", "tagline", "tpl_undangan", "tpl_tagihan", "tpl_kuitansi"];
    for (const [kunci, nilai] of Object.entries(data)) {
      if (!BOLEH.includes(kunci)) continue;
      const ada = await ctx.db.query("pengaturan").withIndex("by_kunci", (q) => q.eq("kunci", kunci)).unique();
      if (ada) await ctx.db.patch(ada._id, { nilai }); else await ctx.db.insert("pengaturan", { kunci, nilai });
    }
    await catat(ctx, me, "Ubah pengaturan", Object.keys(data).filter((k) => BOLEH.includes(k)).join(", "));
  },
});

export const urlUnggahLogo = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibRole(ctx, token, ["admin"]);
    return await ctx.storage.generateUploadUrl();
  },
});

// storageId kosong = hapus logo
export const setLogo = mutation({
  args: { token: v.string(), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { token, storageId }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    const ada = await ctx.db.query("pengaturan").withIndex("by_kunci", (q) => q.eq("kunci", "logoId")).unique();
    if (ada && ada.nilai !== storageId) { try { await ctx.storage.delete(ada.nilai as any); } catch {} }
    if (storageId) {
      if (ada) await ctx.db.patch(ada._id, { nilai: storageId }); else await ctx.db.insert("pengaturan", { kunci: "logoId", nilai: storageId });
    } else if (ada) await ctx.db.delete(ada._id);
    await catat(ctx, me, "Ubah logo", storageId ? "logo baru" : "logo dihapus");
  },
});
