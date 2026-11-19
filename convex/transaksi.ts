import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { wajibStaf, wajibRole, bolehKas, catat, gagal, nominalUntuk, alokasikanBayar, batalkanAlokasi, simpanPembayaran } from "./lib";

const cekTanggal = (t: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw gagal("Format tanggal harus YYYY-MM-DD"); };

export const pratinjau = query({
  args: { token: v.string(), wargaId: v.id("warga"), kasId: v.id("jenisKas") },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const kas = await ctx.db.get(a.kasId), w = await ctx.db.get(a.wargaId);
    if (!kas || !w) return null;
    const ts = (await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", a.wargaId).eq("kasId", a.kasId)).collect())
      .filter((t) => t.terbayar < t.nominal).sort((x, y) => (x.periode < y.periode ? -1 : 1));
    return { nominal: nominalUntuk(kas, w), periode: kas.periode, tunggakanBulan: ts.length, sisa: ts.reduce((s, t) => s + t.nominal - t.terbayar, 0), daftarBulan: ts.map((t) => t.periode) };
  },
});

export const bayar = mutation({
  args: { token: v.string(), wargaId: v.id("warga"), kasId: v.id("jenisKas"), jumlah: v.number(), tanggal: v.string(), metode: v.optional(v.string()), catatan: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const kas = await bolehKas(ctx, u, a.kasId);
    if (!(a.jumlah > 0)) throw gagal("Jumlah harus lebih dari 0");
    cekTanggal(a.tanggal);
    const w = await ctx.db.get(a.wargaId);
    if (!w) throw gagal("Warga tidak ditemukan");
    return await simpanPembayaran(ctx, u, w, kas, { jumlah: a.jumlah, tanggal: a.tanggal, metode: a.metode, catatan: a.catatan });
  },
});

// Ubah pembayaran: alokasi lama dikembalikan, lalu dialokasikan ulang sesuai jumlah baru. Warga & jenis kas tidak bisa diganti (hapus lalu catat ulang).
export const ubahBayar = mutation({
  args: { token: v.string(), id: v.id("pembayaran"), jumlah: v.number(), tanggal: v.string(), metode: v.optional(v.string()), catatan: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const p = await ctx.db.get(a.id);
    if (!p) throw gagal("Pembayaran tidak ditemukan");
    if (p.batal) throw gagal("Pembayaran yang sudah dibatalkan tidak bisa diubah");
    const kas = await bolehKas(ctx, u, p.kasId);
    if (!(a.jumlah > 0)) throw gagal("Jumlah harus lebih dari 0");
    cekTanggal(a.tanggal);
    const w = await ctx.db.get(p.wargaId);
    if (!w) throw gagal("Warga tidak ditemukan");
    await batalkanAlokasi(ctx, p.alokasi);
    const alokasi = await alokasikanBayar(ctx, w, kas, a.jumlah);
    await ctx.db.patch(p._id, { jumlah: a.jumlah, tanggal: a.tanggal, metode: a.metode, catatan: a.catatan, alokasi });
    await catat(ctx, u, "Ubah pembayaran", `${p.noKuitansi}: Rp${p.jumlah} → Rp${a.jumlah}`);
  },
});

export const batalBayar = mutation({
  args: { token: v.string(), id: v.id("pembayaran"), alasan: v.string() },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const p = await ctx.db.get(a.id);
    if (!p || p.batal) throw gagal("Pembayaran tidak ditemukan atau sudah dibatalkan");
    await bolehKas(ctx, u, p.kasId);
    if (!a.alasan.trim()) throw gagal("Alasan pembatalan wajib diisi");
    await batalkanAlokasi(ctx, p.alokasi);
    await ctx.db.patch(p._id, { batal: true, alasanBatal: a.alasan.trim() });
    await catat(ctx, u, "Batalkan pembayaran", `${p.noKuitansi}: ${a.alasan}`);
  },
});

// Hapus permanen (hanya admin). Untuk koreksi yang tetap ingin meninggalkan jejak, pakai "Batalkan".
export const hapusBayar = mutation({
  args: { token: v.string(), id: v.id("pembayaran") },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin"]);
    const p = await ctx.db.get(a.id);
    if (!p) throw gagal("Pembayaran tidak ditemukan");
    if (!p.batal) await batalkanAlokasi(ctx, p.alokasi);
    for (const x of await ctx.db.query("pengajuan").withIndex("by_warga", (q) => q.eq("wargaId", p.wargaId)).collect())
      if (x.pembayaranId === p._id) await ctx.db.patch(x._id, { pembayaranId: undefined });
    await ctx.db.delete(p._id);
    await catat(ctx, u, "Hapus pembayaran", `${p.noKuitansi} Rp${p.jumlah}`);
  },
});

async function perkaya(ctx: any, p: any) {
  const periode = (await Promise.all((p.alokasi as any[]).map(async (al) => (await ctx.db.get(al.tagihanId))?.periode as string | undefined))).filter(Boolean) as string[];
  return {
    ...p,
    periode,
    warga: await ctx.db.get(p.wargaId),
    kas: (await ctx.db.get(p.kasId))?.nama ?? "?",
    petugas: (await ctx.db.get(p.petugasId))?.nama ?? "?",
  };
}

export const daftarBayar = query({
  args: { token: v.string(), kasId: v.optional(v.id("jenisKas")) },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const kasId = a.kasId;
    const rows = kasId
      ? await ctx.db.query("pembayaran").withIndex("by_kas", (q) => q.eq("kasId", kasId)).order("desc").take(150)
      : await ctx.db.query("pembayaran").order("desc").take(150);
    return await Promise.all(rows.map((p) => perkaya(ctx, p)));
  },
});

export const ambilBayar = query({
  args: { token: v.string(), id: v.id("pembayaran") },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const p = await ctx.db.get(a.id);
    return p ? await perkaya(ctx, p) : null;
  },
});

export const buatUrlUnggah = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => { await wajibRole(ctx, token, ["admin", "petugas"]); return await ctx.storage.generateUploadUrl(); },
});

export const catatKeluar = mutation({
  args: { token: v.string(), kasId: v.id("jenisKas"), jumlah: v.number(), tanggal: v.string(), keterangan: v.string(), fotoId: v.optional(v.id("_storage")) },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const kas = await bolehKas(ctx, u, a.kasId);
    if (!(a.jumlah > 0)) throw gagal("Jumlah harus lebih dari 0");
    if (!a.keterangan.trim()) throw gagal("Keterangan wajib diisi");
    cekTanggal(a.tanggal);
    await ctx.db.insert("pengeluaran", { kasId: a.kasId, jumlah: a.jumlah, tanggal: a.tanggal, keterangan: a.keterangan.trim(), fotoId: a.fotoId, petugasId: u._id, batal: false });
    await catat(ctx, u, "Catat pengeluaran", `${kas.nama} Rp${a.jumlah}: ${a.keterangan}`);
  },
});

// fotoId baru = ganti foto; hapusFoto = buang foto lama tanpa pengganti
export const ubahKeluar = mutation({
  args: { token: v.string(), id: v.id("pengeluaran"), kasId: v.id("jenisKas"), jumlah: v.number(), tanggal: v.string(), keterangan: v.string(), fotoId: v.optional(v.id("_storage")), hapusFoto: v.optional(v.boolean()) },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const p = await ctx.db.get(a.id);
    if (!p) throw gagal("Pengeluaran tidak ditemukan");
    if (p.batal) throw gagal("Pengeluaran yang sudah dibatalkan tidak bisa diubah");
    await bolehKas(ctx, u, p.kasId);
    if (a.kasId !== p.kasId) await bolehKas(ctx, u, a.kasId);
    if (!(a.jumlah > 0)) throw gagal("Jumlah harus lebih dari 0");
    if (!a.keterangan.trim()) throw gagal("Keterangan wajib diisi");
    cekTanggal(a.tanggal);
    let fotoId = p.fotoId;
    if (a.fotoId || a.hapusFoto) {
      if (p.fotoId && p.fotoId !== a.fotoId) { try { await ctx.storage.delete(p.fotoId); } catch {} }
      fotoId = a.fotoId;
    }
    await ctx.db.patch(p._id, { kasId: a.kasId, jumlah: a.jumlah, tanggal: a.tanggal, keterangan: a.keterangan.trim(), fotoId });
    await catat(ctx, u, "Ubah pengeluaran", `${p.keterangan} Rp${p.jumlah} → ${a.keterangan.trim()} Rp${a.jumlah}`);
  },
});

export const batalKeluar = mutation({
  args: { token: v.string(), id: v.id("pengeluaran"), alasan: v.string() },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const p = await ctx.db.get(a.id);
    if (!p || p.batal) throw gagal("Data tidak ditemukan atau sudah dibatalkan");
    await bolehKas(ctx, u, p.kasId);
    if (!a.alasan.trim()) throw gagal("Alasan pembatalan wajib diisi");
    await ctx.db.patch(p._id, { batal: true, alasanBatal: a.alasan.trim() });
    await catat(ctx, u, "Batalkan pengeluaran", `${p.keterangan}: ${a.alasan}`);
  },
});

export const hapusKeluar = mutation({
  args: { token: v.string(), id: v.id("pengeluaran") },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin"]);
    const p = await ctx.db.get(a.id);
    if (!p) throw gagal("Data tidak ditemukan");
    if (p.fotoId) { try { await ctx.storage.delete(p.fotoId); } catch {} }
    await ctx.db.delete(p._id);
    await catat(ctx, u, "Hapus pengeluaran", `${p.keterangan} Rp${p.jumlah}`);
  },
});

async function perkayaKeluar(ctx: any, p: any) {
  return {
    ...p,
    kas: (await ctx.db.get(p.kasId))?.nama ?? "?",
    petugas: (await ctx.db.get(p.petugasId))?.nama ?? "?",
    fotoUrl: p.fotoId ? await ctx.storage.getUrl(p.fotoId) : null,
  };
}

export const daftarKeluar = query({
  args: { token: v.string(), kasId: v.optional(v.id("jenisKas")) },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const kasId = a.kasId;
    const rows = kasId
      ? await ctx.db.query("pengeluaran").withIndex("by_kas", (q) => q.eq("kasId", kasId)).order("desc").take(150)
      : await ctx.db.query("pengeluaran").order("desc").take(150);
    return await Promise.all(rows.map((p) => perkayaKeluar(ctx, p)));
  },
});

export const ambilKeluar = query({
  args: { token: v.string(), id: v.id("pengeluaran") },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const p = await ctx.db.get(a.id);
    return p ? await perkayaKeluar(ctx, p) : null;
  },
});
