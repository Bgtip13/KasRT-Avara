import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser, wajibStaf, wajibRole, bolehKas, catat, gagal, simpanPembayaran, Ctx } from "./lib";

// Pembayaran mandiri warga lewat QRIS statis. QRIS statis tidak mengirim notifikasi ke aplikasi, jadi alurnya:
// warga bayar -> unggah bukti -> petugas memeriksa mutasi -> "Setujui" (otomatis menjadi pembayaran + kuitansi) atau "Tolak".

async function wargaSaya(ctx: Ctx, token: string) {
  const u = await getUser(ctx, token);
  if (u.role !== "warga" || !u.wargaId) throw gagal("Hanya akun warga yang terhubung dengan data rumah yang bisa membayar mandiri");
  const w = await ctx.db.get(u.wargaId);
  if (!w || !w.aktif) throw gagal("Data warga tidak aktif. Hubungi pengurus RT.");
  return { u, w };
}

async function qrisAktif(ctx: Ctx) {
  const r = await ctx.db.query("pengaturan").withIndex("by_kunci", (q) => q.eq("kunci", "qrisAktif")).unique();
  return r?.nilai !== "0";
}

export const buatUrlBukti = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await wargaSaya(ctx, token); return await ctx.storage.generateUploadUrl(); },
});

export const buat = mutation({
  args: { token: v.string(), kasId: v.id("jenisKas"), jumlah: v.number(), catatan: v.optional(v.string()), buktiId: v.id("_storage") },
  handler: async (ctx, a) => {
    const { u, w } = await wargaSaya(ctx, a.token);
    if (!(await qrisAktif(ctx))) throw gagal("Pembayaran mandiri QRIS sedang dinonaktifkan");
    const kas = await ctx.db.get(a.kasId);
    if (!kas || !kas.aktif) throw gagal("Jenis kas tidak ditemukan");
    if (!kas.qrisId) throw gagal("Kas ini belum menyediakan QRIS. Silakan bayar ke petugas kas.");
    if (!Number.isInteger(a.jumlah) || a.jumlah <= 0) throw gagal("Jumlah harus berupa angka lebih dari 0");
    if (a.jumlah > 50_000_000) throw gagal("Jumlah terlalu besar");
    const menunggu = (await ctx.db.query("pengajuan").withIndex("by_warga", (q) => q.eq("wargaId", w._id)).collect()).filter((x) => x.status === "menunggu");
    if (menunggu.length >= 5) throw gagal("Masih ada 5 konfirmasi yang belum diperiksa petugas. Tunggu sampai diproses.");
    const tanggal = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const id = await ctx.db.insert("pengajuan", { wargaId: w._id, kasId: kas._id, jumlah: a.jumlah, tanggal, catatan: a.catatan?.trim() || undefined, buktiId: a.buktiId, status: "menunggu" });
    await catat(ctx, u, "Ajukan bayar QRIS", `${kas.nama} Rp${a.jumlah} (${w.nama})`);
    return id;
  },
});

export const milikSaya = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    if (u.role !== "warga" || !u.wargaId) return [];
    const wid = u.wargaId;
    const rows = await ctx.db.query("pengajuan").withIndex("by_warga", (q) => q.eq("wargaId", wid)).order("desc").take(30);
    return await Promise.all(rows.map(async (x) => ({
      _id: x._id, jumlah: x.jumlah, tanggal: x.tanggal, status: x.status, alasanTolak: x.alasanTolak ?? null, noKuitansi: x.noKuitansi ?? null, catatan: x.catatan ?? null,
      kas: (await ctx.db.get(x.kasId))?.nama ?? "?",
    })));
  },
});

export const batalSaya = mutation({
  args: { token: v.string(), id: v.id("pengajuan") },
  handler: async (ctx, a) => {
    const { u, w } = await wargaSaya(ctx, a.token);
    const x = await ctx.db.get(a.id);
    if (!x || x.wargaId !== w._id) throw gagal("Data tidak ditemukan");
    if (x.status !== "menunggu") throw gagal("Konfirmasi ini sudah diproses petugas");
    if (x.buktiId) { try { await ctx.storage.delete(x.buktiId); } catch {} }
    await ctx.db.delete(x._id);
    await catat(ctx, u, "Batalkan pengajuan QRIS", `Rp${x.jumlah}`);
  },
});

export const jumlahMenunggu = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    if (u.role === "warga") return 0;
    const rows = await ctx.db.query("pengajuan").withIndex("by_status", (q) => q.eq("status", "menunggu")).collect();
    if (u.role !== "petugas") return rows.length;
    const kasSaya = new Set((await ctx.db.query("jenisKas").collect()).filter((k) => k.petugasIds.includes(u._id)).map((k) => k._id));
    return rows.filter((x) => kasSaya.has(x.kasId)).length;
  },
});

export const daftar = query({
  args: { token: v.string(), status: v.union(v.literal("menunggu"), v.literal("disetujui"), v.literal("ditolak")) },
  handler: async (ctx, a) => {
    const u = await wajibStaf(ctx, a.token);
    let rows = await ctx.db.query("pengajuan").withIndex("by_status", (q) => q.eq("status", a.status)).order("desc").take(100);
    if (u.role === "petugas") {
      const kasSaya = new Set((await ctx.db.query("jenisKas").collect()).filter((k) => k.petugasIds.includes(u._id)).map((k) => k._id));
      rows = rows.filter((x) => kasSaya.has(x.kasId));
    }
    return await Promise.all(rows.map(async (x) => ({
      _id: x._id, jumlah: x.jumlah, tanggal: x.tanggal, status: x.status, catatan: x.catatan ?? null, alasanTolak: x.alasanTolak ?? null, noKuitansi: x.noKuitansi ?? null,
      warga: await ctx.db.get(x.wargaId),
      kasId: x.kasId,
      kas: (await ctx.db.get(x.kasId))?.nama ?? "?",
      petugas: x.diprosesOleh ? (await ctx.db.get(x.diprosesOleh))?.nama ?? "?" : null,
      buktiUrl: x.buktiId ? await ctx.storage.getUrl(x.buktiId) : null,
    })));
  },
});

export const setujui = mutation({
  args: { token: v.string(), id: v.id("pengajuan") },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const x = await ctx.db.get(a.id);
    if (!x) throw gagal("Data tidak ditemukan");
    if (x.status !== "menunggu") throw gagal("Konfirmasi ini sudah diproses");
    const kas = await bolehKas(ctx, u, x.kasId);
    const w = await ctx.db.get(x.wargaId);
    if (!w) throw gagal("Warga tidak ditemukan");
    const r = await simpanPembayaran(ctx, u, w, kas, { jumlah: x.jumlah, tanggal: x.tanggal, metode: "QRIS", catatan: x.catatan ? `QRIS · ${x.catatan}` : "Pembayaran mandiri via QRIS" });
    await ctx.db.patch(x._id, { status: "disetujui", diprosesOleh: u._id, pembayaranId: r.id, noKuitansi: r.noKuitansi });
    return { noKuitansi: r.noKuitansi };
  },
});

export const tolak = mutation({
  args: { token: v.string(), id: v.id("pengajuan"), alasan: v.string() },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const x = await ctx.db.get(a.id);
    if (!x) throw gagal("Data tidak ditemukan");
    if (x.status !== "menunggu") throw gagal("Konfirmasi ini sudah diproses");
    await bolehKas(ctx, u, x.kasId);
    if (!a.alasan.trim()) throw gagal("Alasan penolakan wajib diisi");
    await ctx.db.patch(x._id, { status: "ditolak", alasanTolak: a.alasan.trim(), diprosesOleh: u._id });
    await catat(ctx, u, "Tolak pengajuan QRIS", `Rp${x.jumlah}: ${a.alasan}`);
  },
});

// Hapus arsip pengajuan (tidak memengaruhi pembayaran yang sudah tercatat)
export const hapus = mutation({
  args: { token: v.string(), id: v.id("pengajuan") },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin"]);
    const x = await ctx.db.get(a.id);
    if (!x) throw gagal("Data tidak ditemukan");
    if (x.status === "menunggu") throw gagal("Setujui atau tolak dulu sebelum menghapus");
    if (x.buktiId) { try { await ctx.storage.delete(x.buktiId); } catch {} }
    await ctx.db.delete(x._id);
    await catat(ctx, u, "Hapus arsip pengajuan QRIS", `Rp${x.jumlah} (${x.status})`);
  },
});
