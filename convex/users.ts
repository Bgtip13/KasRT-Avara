import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { wajibRole, normWa, validWa, gagal, catat, acak, hashPin, pinAcak } from "./lib";

const role = v.union(v.literal("admin"), v.literal("petugas"), v.literal("pengawas"));

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibRole(ctx, token, ["admin"]);
    return (await ctx.db.query("users").collect()).map((u) => ({ _id: u._id, nama: u.nama, phone: u.phone, role: u.role, aktif: u.aktif, wajibGanti: u.wajibGanti }));
  },
});

// Admin membuat akun. PIN awal diacak (atau diketik admin), ditampilkan SEKALI ke admin untuk diberikan ke orangnya.
export const buat = mutation({
  args: { token: v.string(), nama: v.string(), phone: v.string(), role, pin: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    const p = normWa(a.phone);
    if (!validWa(p)) throw gagal("Nomor WA tidak valid");
    if (!a.nama.trim()) throw gagal("Nama wajib diisi");
    if (await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", p)).unique()) throw gagal("Nomor sudah terdaftar");
    const pin = a.pin?.trim() || pinAcak();
    if (!/^\d{6}$/.test(pin)) throw gagal("PIN awal harus 6 angka");
    const salt = acak(16);
    await ctx.db.insert("users", { phone: p, nama: a.nama.trim(), role: a.role, aktif: true, pinSalt: salt, pinHash: await hashPin(pin, salt), wajibGanti: true });
    await catat(ctx, me, "Buat akun", `${a.nama} (${a.role})`);
    return { pin };
  },
});

export const ubah = mutation({
  args: { token: v.string(), id: v.id("users"), nama: v.string(), role, aktif: v.boolean() },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    if (a.id === me._id && (!a.aktif || a.role !== "admin")) throw gagal("Anda tidak bisa menurunkan akun Anda sendiri");
    await ctx.db.patch(a.id, { nama: a.nama.trim(), role: a.role, aktif: a.aktif });
    if (!a.aktif) for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", a.id)).collect()) await ctx.db.delete(s._id);
    await catat(ctx, me, "Ubah pengguna", `${a.nama} → ${a.role}, ${a.aktif ? "aktif" : "nonaktif"}`);
  },
});

// Lupa PIN / ganti HP: admin membuat PIN awal baru; pengguna wajib menggantinya saat masuk
export const resetPin = mutation({
  args: { token: v.string(), id: v.id("users") },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    const u = await ctx.db.get(a.id);
    if (!u) throw gagal("Pengguna tidak ditemukan");
    const pin = pinAcak();
    const salt = acak(16);
    await ctx.db.patch(a.id, { pinSalt: salt, pinHash: await hashPin(pin, salt), wajibGanti: true, gagal: 0, terkunciSampai: undefined });
    for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", a.id)).collect()) await ctx.db.delete(s._id);
    for (const d of await ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", a.id)).collect()) await ctx.db.delete(d._id);
    await catat(ctx, me, "Reset PIN", u.nama);
    return { pin };
  },
});
