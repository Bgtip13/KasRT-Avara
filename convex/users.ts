import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { wajibRole, normWa, validWa, gagal, catat, acak, hashPin, pinAcak } from "./lib";

const role = v.union(v.literal("admin"), v.literal("petugas"), v.literal("pengawas"), v.literal("warga"));

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibRole(ctx, token, ["admin"]);
    const out = [];
    for (const u of await ctx.db.query("users").collect()) {
      const w = u.wargaId ? await ctx.db.get(u.wargaId) : null;
      out.push({ _id: u._id, nama: u.nama, phone: u.phone, role: u.role, aktif: u.aktif, wajibGanti: u.wajibGanti, wargaId: u.wargaId, noRumah: w?.noRumah });
    }
    return out;
  },
});

// Admin membuat akun. PIN awal diacak (atau diketik admin), ditampilkan SEKALI ke admin untuk diberikan ke orangnya.
// Akun role "warga" wajib dihubungkan ke satu data warga, supaya mereka bisa melihat riwayat & tunggakan rumahnya sendiri.
export const buat = mutation({
  args: { token: v.string(), nama: v.string(), phone: v.string(), role, pin: v.optional(v.string()), wargaId: v.optional(v.id("warga")) },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    const p = normWa(a.phone);
    if (!validWa(p)) throw gagal("Nomor WA tidak valid");
    if (!a.nama.trim()) throw gagal("Nama wajib diisi");
    if (await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", p)).unique()) throw gagal("Nomor sudah terdaftar");
    let wargaId: Id<"warga"> | undefined;
    if (a.role === "warga") {
      if (!a.wargaId) throw gagal("Pilih data warga yang akan dihubungkan dengan akun ini");
      if (!(await ctx.db.get(a.wargaId))) throw gagal("Data warga tidak ditemukan");
      const wid = a.wargaId;
      if (await ctx.db.query("users").withIndex("by_warga", (q) => q.eq("wargaId", wid)).first()) throw gagal("Warga ini sudah punya akun");
      wargaId = wid;
    } else if (a.wargaId) throw gagal("Hanya akun warga yang dihubungkan dengan data warga");
    const pin = a.pin?.trim() || pinAcak();
    if (!/^\d{6}$/.test(pin)) throw gagal("PIN awal harus 6 angka");
    const salt = acak(16);
    await ctx.db.insert("users", { phone: p, nama: a.nama.trim(), role: a.role, aktif: true, pinSalt: salt, pinHash: await hashPin(pin, salt), wajibGanti: true, wargaId });
    await catat(ctx, me, "Buat akun", `${a.nama} (${a.role})`);
    return { pin };
  },
});

// Membuat akun untuk warga aktif yang belum punya akun, per kelompok kecil (hashing PIN berat, jadi aplikasi memanggil berulang sampai `sisa` = 0).
// Warga yang nomor WA-nya tidak valid / sama dengan akun lain dilewati dan dilaporkan.
export const buatMassalWarga = mutation({
  args: { token: v.string(), batas: v.optional(v.number()) },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    const batas = Math.min(Math.max(Math.floor(a.batas ?? 5), 1), 8);
    const users = await ctx.db.query("users").collect();
    const sudahAkun = new Set<Id<"warga">>();
    const noTerpakai = new Set<string>();
    for (const u of users) { noTerpakai.add(u.phone); if (u.wargaId) sudahAkun.add(u.wargaId); }
    const calon = (await ctx.db.query("warga").collect())
      .filter((w) => w.aktif && !sudahAkun.has(w._id))
      .sort((x, y) => x.noRumah.localeCompare(y.noRumah, "id", { numeric: true }));
    const rencana: typeof calon = [];
    const dilewati: { nama: string; noRumah: string; alasan: string }[] = [];
    for (const w of calon) {
      const p = normWa(w.noWa);
      if (!validWa(p)) { dilewati.push({ nama: w.nama, noRumah: w.noRumah, alasan: "Nomor WA tidak valid" }); continue; }
      if (noTerpakai.has(p)) { dilewati.push({ nama: w.nama, noRumah: w.noRumah, alasan: "Nomor WA sudah dipakai akun lain" }); continue; }
      noTerpakai.add(p);
      rencana.push(w);
    }
    const dibuat: { nama: string; noRumah: string; phone: string; pin: string }[] = [];
    for (const w of rencana.slice(0, batas)) {
      const pin = pinAcak(), salt = acak(16), phone = normWa(w.noWa);
      await ctx.db.insert("users", { phone, nama: w.nama, role: "warga", aktif: true, pinSalt: salt, pinHash: await hashPin(pin, salt), wajibGanti: true, wargaId: w._id });
      dibuat.push({ nama: w.nama, noRumah: w.noRumah, phone, pin });
    }
    if (dibuat.length) await catat(ctx, me, "Buat akun warga massal", `${dibuat.length} akun`);
    return { dibuat, sisa: rencana.length - dibuat.length, dilewati };
  },
});

export const ubah = mutation({
  args: { token: v.string(), id: v.id("users"), nama: v.string(), role, aktif: v.boolean() },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    if (a.id === me._id && (!a.aktif || a.role !== "admin")) throw gagal("Anda tidak bisa menurunkan akun Anda sendiri");
    const target = await ctx.db.get(a.id);
    if (!target) throw gagal("Pengguna tidak ditemukan");
    if ((target.role === "warga") !== (a.role === "warga")) throw gagal("Peran warga dan peran pengurus tidak bisa saling diubah. Buat akun baru.");
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

// Hapus akun. Akun yang pernah mencatat transaksi hanya boleh dinonaktifkan, supaya nama petugas di riwayat tidak hilang.
export const hapus = mutation({
  args: { token: v.string(), id: v.id("users") },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    if (a.id === me._id) throw gagal("Anda tidak bisa menghapus akun Anda sendiri");
    const u = await ctx.db.get(a.id);
    if (!u) throw gagal("Pengguna tidak ditemukan");
    const pernah = (await ctx.db.query("pembayaran").collect()).some((x) => x.petugasId === a.id) || (await ctx.db.query("pengeluaran").collect()).some((x) => x.petugasId === a.id);
    if (pernah) throw gagal("Akun ini pernah mencatat transaksi. Nonaktifkan saja agar riwayat tetap utuh.");
    for (const k of await ctx.db.query("jenisKas").collect())
      if (k.petugasIds.includes(a.id)) await ctx.db.patch(k._id, { petugasIds: k.petugasIds.filter((x) => x !== a.id) });
    for (const s of await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", a.id)).collect()) await ctx.db.delete(s._id);
    for (const d of await ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", a.id)).collect()) await ctx.db.delete(d._id);
    await ctx.db.delete(a.id);
    await catat(ctx, me, "Hapus akun", `${u.nama} (${u.role})`);
  },
});
