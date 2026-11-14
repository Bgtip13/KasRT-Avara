import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getUser, wajibRole, bolehKas, catat, gagal, pastikanTagihan, nominalUntuk, bulanIni, bulanBerikut, acak } from "./lib";

export const pratinjau = query({
  args: { token: v.string(), wargaId: v.id("warga"), kasId: v.id("jenisKas") },
  handler: async (ctx, a) => {
    await getUser(ctx, a.token);
    const kas = await ctx.db.get(a.kasId), w = await ctx.db.get(a.wargaId);
    if (!kas || !w) return null;
    const ts = (await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", a.wargaId).eq("kasId", a.kasId)).collect())
      .filter((t) => t.terbayar < t.nominal).sort((x, y) => (x.periode < y.periode ? -1 : 1));
    return { nominal: nominalUntuk(kas, w), periode: kas.periode, tunggakanBulan: ts.length, sisa: ts.reduce((s, t) => s + t.nominal - t.terbayar, 0), daftarBulan: ts.map((t) => t.periode) };
  },
});

// Pembayaran dialokasikan ke tagihan tertua yang belum lunas, lalu ke bulan-bulan berikutnya (bayar di muka)
export const bayar = mutation({
  args: { token: v.string(), wargaId: v.id("warga"), kasId: v.id("jenisKas"), jumlah: v.number(), tanggal: v.string(), metode: v.optional(v.string()), catatan: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const u = await wajibRole(ctx, a.token, ["admin", "petugas"]);
    const kas = await bolehKas(ctx, u, a.kasId);
    if (!(a.jumlah > 0)) throw gagal("Jumlah harus lebih dari 0");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.tanggal)) throw gagal("Format tanggal harus YYYY-MM-DD");
    const w = await ctx.db.get(a.wargaId);
    if (!w) throw gagal("Warga tidak ditemukan");
    let sisa = a.jumlah;
    const alokasi: { tagihanId: Id<"tagihan">; jumlah: number }[] = [];
    if (kas.periode !== "bebas") {
      const ada = (await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", a.wargaId).eq("kasId", a.kasId)).collect())
        .sort((x, y) => (x.periode < y.periode ? -1 : 1));
      let periode = "sekali";
      if (kas.periode === "bulanan") {
        const belum = ada.find((t) => t.terbayar < t.nominal);
        periode = belum ? belum.periode : ada.length ? bulanBerikut(ada[ada.length - 1].periode) : bulanIni();
      }
      for (let i = 0; sisa > 0 && i < 60; i++) {
        const t = await pastikanTagihan(ctx, w, kas, periode);
        const kurang = t.nominal - t.terbayar;
        if (kurang > 0) {
          const bayar = Math.min(kurang, sisa);
          await ctx.db.patch(t._id, { terbayar: t.terbayar + bayar });
          alokasi.push({ tagihanId: t._id, jumlah: bayar });
          sisa -= bayar;
        }
        if (kas.periode === "sekali") break;
        periode = bulanBerikut(periode);
      }
    }
    const noKuitansi = `KR-${a.tanggal.replace(/-/g, "")}-${acak(2).toUpperCase()}`;
    const id = await ctx.db.insert("pembayaran", { wargaId: a.wargaId, kasId: a.kasId, jumlah: a.jumlah, tanggal: a.tanggal, petugasId: u._id, metode: a.metode, catatan: a.catatan, alokasi, noKuitansi, batal: false });
    await catat(ctx, u, "Catat pembayaran", `${noKuitansi} ${kas.nama} ${w.nama} Rp${a.jumlah}`);
    return { id, noKuitansi };
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
    for (const al of p.alokasi) {
      const t = await ctx.db.get(al.tagihanId);
      if (t) await ctx.db.patch(t._id, { terbayar: Math.max(0, t.terbayar - al.jumlah) });
    }
    await ctx.db.patch(p._id, { batal: true, alasanBatal: a.alasan.trim() });
    await catat(ctx, u, "Batalkan pembayaran", `${p.noKuitansi}: ${a.alasan}`);
  },
});

export const daftarBayar = query({
  args: { token: v.string(), kasId: v.optional(v.id("jenisKas")) },
  handler: async (ctx, a) => {
    await getUser(ctx, a.token);
    const kasId = a.kasId;
    const rows = kasId
      ? await ctx.db.query("pembayaran").withIndex("by_kas", (q) => q.eq("kasId", kasId)).order("desc").take(80)
      : await ctx.db.query("pembayaran").order("desc").take(80);
    return await Promise.all(rows.map(async (p) => ({
      ...p,
      warga: await ctx.db.get(p.wargaId),
      kas: (await ctx.db.get(p.kasId))?.nama ?? "?",
      petugas: (await ctx.db.get(p.petugasId))?.nama ?? "?",
    })));
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.tanggal)) throw gagal("Format tanggal harus YYYY-MM-DD");
    await ctx.db.insert("pengeluaran", { kasId: a.kasId, jumlah: a.jumlah, tanggal: a.tanggal, keterangan: a.keterangan.trim(), fotoId: a.fotoId, petugasId: u._id, batal: false });
    await catat(ctx, u, "Catat pengeluaran", `${kas.nama} Rp${a.jumlah}: ${a.keterangan}`);
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

export const daftarKeluar = query({
  args: { token: v.string(), kasId: v.optional(v.id("jenisKas")) },
  handler: async (ctx, a) => {
    await getUser(ctx, a.token);
    const kasId = a.kasId;
    const rows = kasId
      ? await ctx.db.query("pengeluaran").withIndex("by_kas", (q) => q.eq("kasId", kasId)).order("desc").take(80)
      : await ctx.db.query("pengeluaran").order("desc").take(80);
    return await Promise.all(rows.map(async (p) => ({
      ...p,
      kas: (await ctx.db.get(p.kasId))?.nama ?? "?",
      petugas: (await ctx.db.get(p.petugasId))?.nama ?? "?",
      fotoUrl: p.fotoId ? await ctx.storage.getUrl(p.fotoId) : null,
    })));
  },
});
