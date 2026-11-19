import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { wajibRole, wajibStaf, ringkasKas, catat, gagal } from "./lib";

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await wajibStaf(ctx, token);
    const semua = (await ctx.db.query("jenisKas").collect()).sort((a, b) => a.urutan - b.urutan);
    const out = [];
    for (const k of semua) {
      const r = await ringkasKas(ctx, k, "0000-00-00", "9999-99-99");
      const namaPetugas = await Promise.all(k.petugasIds.map(async (id) => (await ctx.db.get(id))?.nama ?? "?"));
      const qrisUrl = k.qrisId ? await ctx.storage.getUrl(k.qrisId) : null;
      out.push({ ...k, qrisUrl, saldo: r.saldoAkhir, namaPetugas, boleh: k.aktif && (u.role === "admin" || (u.role === "petugas" && k.petugasIds.includes(u._id))) });
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
    // QRIS per kas: qrisId kosong = hapus QRIS kas ini
    qrisId: v.optional(v.id("_storage")), qrisNama: v.optional(v.string()), qrisCatatan: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, ...a }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    if (!a.nama.trim()) throw gagal("Nama kas wajib diisi");
    if (a.periode !== "bebas" && !(a.nominal > 0)) throw gagal("Nominal harus lebih dari 0");
    const data = { ...a, nama: a.nama.trim(), qrisNama: a.qrisNama?.trim() || undefined, qrisCatatan: a.qrisCatatan?.trim() || undefined };
    if (id) {
      // Hapus berkas QRIS lama dari storage bila diganti atau dihapus
      const lama = await ctx.db.get(id);
      if (lama?.qrisId && lama.qrisId !== data.qrisId) { try { await ctx.storage.delete(lama.qrisId); } catch {} }
    }
    if (id) await ctx.db.patch(id, data);
    else await ctx.db.insert("jenisKas", { ...data, urutan: (await ctx.db.query("jenisKas").collect()).length });
    await catat(ctx, me, id ? "Ubah jenis kas" : "Tambah jenis kas", data.nama);
  },
});

export const buatUrlQris = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await wajibRole(ctx, token, ["admin"]); return await ctx.storage.generateUploadUrl(); },
});

// Jenis kas yang sudah punya transaksi tidak boleh dihapus (nonaktifkan saja)
export const hapus = mutation({
  args: { token: v.string(), id: v.id("jenisKas") },
  handler: async (ctx, { token, id }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    const k = await ctx.db.get(id);
    if (!k) throw gagal("Jenis kas tidak ditemukan");
    if (await ctx.db.query("pembayaran").withIndex("by_kas", (q) => q.eq("kasId", id)).first() || await ctx.db.query("pengeluaran").withIndex("by_kas", (q) => q.eq("kasId", id)).first())
      throw gagal("Kas ini sudah punya transaksi, jadi tidak bisa dihapus. Nonaktifkan saja.");
    const tagihan = await ctx.db.query("tagihan").withIndex("by_kas", (q) => q.eq("kasId", id)).collect();
    if (tagihan.some((t) => t.terbayar > 0)) throw gagal("Kas ini punya tagihan yang sudah terbayar. Nonaktifkan saja.");
    for (const t of tagihan) await ctx.db.delete(t._id);
    for (const x of await ctx.db.query("pengajuan").collect()) if (x.kasId === id) {
      if (x.buktiId) { try { await ctx.storage.delete(x.buktiId); } catch {} }
      await ctx.db.delete(x._id);
    }
    if (k.qrisId) { try { await ctx.storage.delete(k.qrisId); } catch {} }
    await ctx.db.delete(id);
    await catat(ctx, me, "Hapus jenis kas", k.nama);
  },
});
