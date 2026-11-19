import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { wajibStaf, wajibRole, normWa, validWa, gagal, catat, undangWargaKeAcaraMendatang } from "./lib";

const status = v.union(v.literal("tetap"), v.literal("kontrak"));

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibStaf(ctx, token);
    return (await ctx.db.query("warga").collect()).sort((a, b) => a.noRumah.localeCompare(b.noRumah, "id", { numeric: true }));
  },
});

const cek = (a: { nama: string; noRumah: string; noWa: string }) => {
  const wa = normWa(a.noWa);
  if (!a.nama.trim()) throw gagal("Nama wajib diisi");
  if (!a.noRumah.trim()) throw gagal("Nomor rumah wajib diisi");
  if (!validWa(wa)) throw gagal("Nomor WA tidak valid (contoh 0812xxxxxxx)");
  return wa;
};

export const simpan = mutation({
  args: { token: v.string(), id: v.optional(v.id("warga")), nama: v.string(), noRumah: v.string(), noWa: v.string(), statusHunian: status, blok: v.optional(v.string()), catatan: v.optional(v.string()), aktif: v.boolean() },
  handler: async (ctx, { token, id, ...a }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    const data = { ...a, nama: a.nama.trim(), noRumah: a.noRumah.trim(), noWa: cek(a) };
    const wid = id ?? (await ctx.db.insert("warga", data));
    if (id) await ctx.db.patch(id, data);
    if (data.aktif) await undangWargaKeAcaraMendatang(ctx, wid);
    await catat(ctx, me, id ? "Ubah warga" : "Tambah warga", `${data.nama} / ${data.noRumah}`);
  },
});

export const impor = mutation({
  args: {
    token: v.string(),
    baris: v.array(v.object({ nama: v.string(), noRumah: v.string(), noWa: v.string(), statusHunian: status, blok: v.optional(v.string()), catatan: v.optional(v.string()) })),
  },
  handler: async (ctx, { token, baris }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    let ditambah = 0, diperbarui = 0, dilewati = 0;
    for (const b of baris) {
      let wa: string;
      try { wa = cek(b); } catch { dilewati++; continue; }
      const data = { ...b, nama: b.nama.trim(), noRumah: b.noRumah.trim(), noWa: wa, aktif: true };
      const sama = (await ctx.db.query("warga").withIndex("by_rumah", (q) => q.eq("noRumah", data.noRumah)).collect())
        .find((w) => w.nama.toLowerCase() === data.nama.toLowerCase());
      if (sama) { await ctx.db.patch(sama._id, data); await undangWargaKeAcaraMendatang(ctx, sama._id); diperbarui++; }
      else { const nid = await ctx.db.insert("warga", data); await undangWargaKeAcaraMendatang(ctx, nid); ditambah++; }
    }
    await catat(ctx, me, "Impor warga", `+${ditambah} baru, ${diperbarui} diperbarui, ${dilewati} dilewati`);
    return { ditambah, diperbarui, dilewati };
  },
});

// Hapus permanen hanya untuk warga tanpa riwayat pembayaran. Selain itu nonaktifkan, supaya laporan kas tetap utuh.
export const hapus = mutation({
  args: { token: v.string(), id: v.id("warga") },
  handler: async (ctx, { token, id }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    const w = await ctx.db.get(id);
    if (!w) throw gagal("Warga tidak ditemukan");
    if (await ctx.db.query("pembayaran").withIndex("by_warga", (q) => q.eq("wargaId", id)).first())
      throw gagal("Warga ini punya riwayat pembayaran, jadi tidak bisa dihapus. Nonaktifkan saja agar laporan kas tetap utuh.");
    const tagihan = await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", id)).collect();
    if (tagihan.some((t) => t.terbayar > 0)) throw gagal("Warga ini punya tagihan yang sudah terbayar. Nonaktifkan saja.");
    for (const t of tagihan) await ctx.db.delete(t._id);
    for (const x of await ctx.db.query("antrean").collect()) if (x.wargaId === id) await ctx.db.delete(x._id);
    for (const x of await ctx.db.query("pengajuan").withIndex("by_warga", (q) => q.eq("wargaId", id)).collect()) {
      if (x.buktiId) { try { await ctx.storage.delete(x.buktiId); } catch {} }
      await ctx.db.delete(x._id);
    }
    for (const u of await ctx.db.query("users").withIndex("by_warga", (q) => q.eq("wargaId", id)).collect()) {
      for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) await ctx.db.delete(s._id);
      for (const d of await ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) await ctx.db.delete(d._id);
      await ctx.db.delete(u._id);
    }
    await ctx.db.delete(id);
    await catat(ctx, me, "Hapus warga", `${w.nama} / ${w.noRumah}`);
  },
});
