import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, wajibRole, ringkasKas, catat, gagal } from "./lib";

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    const semua = (await ctx.db.query("jenisKas").collect()).sort((a, b) => a.urutan - b.urutan);
    const out = [];
    for (const k of semua) {
      const r = await ringkasKas(ctx, k, "0000-00-00", "9999-99-99");
      const namaPetugas = await Promise.all(k.petugasIds.map(async (id) => (await ctx.db.get(id))?.nama ?? "?"));
      out.push({ ...k, saldo: r.saldoAkhir, namaPetugas, boleh: k.aktif && (u.role === "admin" || (u.role === "petugas" && k.petugasIds.includes(u._id))) });
    }
    return out;
  },
});

export const simpan = mutation({
  args: {
    token: v.string(), id: v.optional(v.id("jenisKas")), nama: v.string(),
    periode: v.union(v.literal("bulanan"), v.literal("sekali"), v.literal("bebas")),
    nominal: v.number(), nominalKontrak: v.optional(v.number()),
    petugasIds: v.array(v.id("users")), aktif: v.boolean(), saldoAwal: v.number(),
  },
  handler: async (ctx, { token, id, ...a }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    if (!a.nama.trim()) throw gagal("Nama kas wajib diisi");
    if (a.periode !== "bebas" && !(a.nominal > 0)) throw gagal("Nominal harus lebih dari 0");
    const data = { ...a, nama: a.nama.trim() };
    if (id) await ctx.db.patch(id, data);
    else await ctx.db.insert("jenisKas", { ...data, urutan: (await ctx.db.query("jenisKas").collect()).length });
    await catat(ctx, me, id ? "Ubah jenis kas" : "Tambah jenis kas", data.nama);
  },
});
