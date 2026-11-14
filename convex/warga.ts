import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, wajibRole, normWa, validWa, gagal, catat } from "./lib";

const status = v.union(v.literal("tetap"), v.literal("kontrak"));

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await getUser(ctx, token);
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
    if (id) await ctx.db.patch(id, data); else await ctx.db.insert("warga", data);
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
      if (sama) { await ctx.db.patch(sama._id, data); diperbarui++; } else { await ctx.db.insert("warga", data); ditambah++; }
    }
    await catat(ctx, me, "Impor warga", `+${ditambah} baru, ${diperbarui} diperbarui, ${dilewati} dilewati`);
    return { ditambah, diperbarui, dilewati };
  },
});
