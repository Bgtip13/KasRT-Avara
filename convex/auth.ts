import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { acak, sha256, hashPin, normWa, gagal, getUser, pinLemah } from "./lib";

async function buatSesi(ctx: MutationCtx, u: Doc<"users">) {
  const token = acak(32);
  await ctx.db.insert("sessions", { userId: u._id, token, expiresAt: Date.now() + 24 * 3600e3 });
  return { token, nama: u.nama, role: u.role, wajibGanti: u.wajibGanti };
}
const byPhone = (ctx: MutationCtx, p: string) =>
  ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", p)).unique();

// Login harian: nomor + PIN (dikunci 15 menit setelah 5x salah).
// Akun dibuat oleh admin dengan PIN awal; admin pertama dibuat otomatis saat login dengan
// ADMIN_PHONE + ADMIN_PIN_AWAL (env Convex) selama belum ada pengguna sama sekali.
export const loginPin = mutation({
  args: { phone: v.string(), pin: v.string() },
  handler: async (ctx, { phone, pin }) => {
    const p = normWa(phone);
    const salah = { ok: false as const, pesan: "Nomor atau PIN salah" };
    let u = await byPhone(ctx, p);
    if (!u) {
      const adaUser = await ctx.db.query("users").first();
      const adminPhone = normWa(process.env.ADMIN_PHONE ?? "");
      const pinAwal = process.env.ADMIN_PIN_AWAL ?? "";
      if (adaUser || !adminPhone || p !== adminPhone || !/^\d{6}$/.test(pinAwal) || pin !== pinAwal) return salah;
      const salt = acak(16);
      const id = await ctx.db.insert("users", { phone: p, nama: "Admin", role: "admin", aktif: true, pinSalt: salt, pinHash: await hashPin(pinAwal, salt), wajibGanti: true });
      u = (await ctx.db.get(id))!;
    }
    if (!u.aktif) return salah;
    if (u.terkunciSampai && u.terkunciSampai > Date.now())
      return { ok: false as const, pesan: `Akun terkunci sementara. Coba lagi ${Math.ceil((u.terkunciSampai - Date.now()) / 60000)} menit lagi` };
    if ((await hashPin(pin, u.pinSalt)) !== u.pinHash) {
      const n = (u.gagal ?? 0) + 1;
      await ctx.db.patch(u._id, n >= 5 ? { gagal: 0, terkunciSampai: Date.now() + 15 * 60000 } : { gagal: n });
      return salah;
    }
    await ctx.db.patch(u._id, { gagal: 0, terkunciSampai: undefined });
    return { ok: true as const, ...(await buatSesi(ctx, u)) };
  },
});

// Biometrik ala mobile banking: server mengeluarkan kunci perangkat, disimpan di SecureStore yang dikunci biometrik
export const aktifkanBiometrik = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    const deviceKey = acak(32);
    await ctx.db.insert("devices", { userId: u._id, keyHash: await sha256(deviceKey) });
    return deviceKey;
  },
});
export const matikanBiometrik = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    for (const d of await ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", u._id)).collect()) await ctx.db.delete(d._id);
  },
});
export const loginPerangkat = mutation({
  args: { phone: v.string(), deviceKey: v.string() },
  handler: async (ctx, { phone, deviceKey }) => {
    const u = await byPhone(ctx, normWa(phone));
    if (!u || !u.aktif || u.wajibGanti) return { ok: false as const, pesan: "Masuk dengan PIN" };
    const h = await sha256(deviceKey);
    const ds = await ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", u._id)).collect();
    if (!ds.some((d) => d.keyHash === h)) return { ok: false as const, pesan: "Biometrik tidak valid, masuk dengan PIN" };
    return { ok: true as const, ...(await buatSesi(ctx, u)) };
  },
});

function cekPinBaru(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw gagal("PIN baru harus 6 angka");
  if (pinLemah(pin)) throw gagal("PIN terlalu mudah ditebak (mis. 123456 atau 111111). Pilih yang lain");
}

// Dipakai saat login pertama / setelah direset admin: tidak perlu PIN lama, cukup sesi yang baru masuk
export const gantiPinAwal = mutation({
  args: { token: v.string(), pinBaru: v.string() },
  handler: async (ctx, a) => {
    const u = await getUser(ctx, a.token, true);
    if (!u.wajibGanti) throw gagal("PIN Anda sudah pernah diganti");
    cekPinBaru(a.pinBaru);
    if ((await hashPin(a.pinBaru, u.pinSalt)) === u.pinHash) throw gagal("PIN baru tidak boleh sama dengan PIN awal");
    const salt = acak(16);
    await ctx.db.patch(u._id, { pinSalt: salt, pinHash: await hashPin(a.pinBaru, salt), wajibGanti: false });
  },
});

export const gantiPin = mutation({
  args: { token: v.string(), pinLama: v.string(), pinBaru: v.string() },
  handler: async (ctx, a) => {
    const u = await getUser(ctx, a.token);
    cekPinBaru(a.pinBaru);
    if ((await hashPin(a.pinLama, u.pinSalt)) !== u.pinHash) throw gagal("PIN lama salah");
    const salt = acak(16);
    await ctx.db.patch(u._id, { pinSalt: salt, pinHash: await hashPin(a.pinBaru, salt) });
  },
});

export const keluar = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

export const saya = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!s || s.expiresAt < Date.now()) return null;
    const u = await ctx.db.get(s.userId);
    if (!u || !u.aktif) return null;
    return { id: u._id, nama: u.nama, role: u.role, phone: u.phone, wajibGanti: u.wajibGanti };
  },
});
