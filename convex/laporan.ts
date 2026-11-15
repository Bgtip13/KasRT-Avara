import { query } from "./_generated/server";
import { v } from "convex/values";
import { wajibStaf, ringkasKas, hitungTunggakan, hariIni, bulanIni } from "./lib";

export const dashboard = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibStaf(ctx, token);
    const bulan = bulanIni();
    const kasAktif = (await ctx.db.query("jenisKas").collect()).filter((k) => k.aktif).sort((a, b) => a.urutan - b.urutan);
    const wargaAktif = (await ctx.db.query("warga").collect()).filter((w) => w.aktif).length;
    const tagBulan = await ctx.db.query("tagihan").withIndex("by_periode", (q) => q.eq("periode", bulan)).collect();
    let totalSaldo = 0;
    const kas = [];
    for (const k of kasAktif) {
      const all = await ringkasKas(ctx, k, "0000-00-00", "9999-99-99");
      const bln = await ringkasKas(ctx, k, bulan + "-01", bulan + "-31");
      totalSaldo += all.saldoAkhir;
      const lunas = tagBulan.filter((t) => t.kasId === k._id && t.terbayar >= t.nominal).length;
      kas.push({ _id: k._id, nama: k.nama, periode: k.periode, saldo: all.saldoAkhir, masukBulan: bln.masuk, keluarBulan: bln.keluar, belumBayar: k.periode === "bulanan" ? Math.max(0, wargaAktif - lunas) : null });
    }
    // Tren 6 bulan terakhir
    const bulanList: string[] = [];
    const d = new Date(Date.now() + 7 * 3600e3);
    for (let i = 5; i >= 0; i--) bulanList.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
    const mulai = bulanList[0] + "-01";
    const pm = (await ctx.db.query("pembayaran").withIndex("by_tanggal", (q) => q.gte("tanggal", mulai)).collect()).filter((x) => !x.batal);
    const pk = (await ctx.db.query("pengeluaran").withIndex("by_tanggal", (q) => q.gte("tanggal", mulai)).collect()).filter((x) => !x.batal);
    const tren = bulanList.map((b) => ({
      bulan: b,
      masuk: pm.filter((x) => x.tanggal.startsWith(b)).reduce((s, x) => s + x.jumlah, 0),
      keluar: pk.filter((x) => x.tanggal.startsWith(b)).reduce((s, x) => s + x.jumlah, 0),
    }));
    const acara = await ctx.db.query("event").withIndex("by_tanggal", (q) => q.gte("tanggal", hariIni())).first();
    return { totalSaldo, kas, tren, acara, wargaAktif };
  },
});

export const bulanan = query({
  args: { token: v.string(), bulan: v.string() },
  handler: async (ctx, { token, bulan }) => {
    await wajibStaf(ctx, token);
    const dari = bulan + "-01", sampai = bulan + "-31";
    const kasAktif = (await ctx.db.query("jenisKas").collect()).sort((a, b) => a.urutan - b.urutan);
    const kas = [];
    for (const k of kasAktif) kas.push({ _id: k._id, nama: k.nama, ...(await ringkasKas(ctx, k, dari, sampai)) });
    const nama = new Map(kasAktif.map((k) => [k._id, k.nama] as const));
    const pm = (await ctx.db.query("pembayaran").withIndex("by_tanggal", (q) => q.gte("tanggal", dari).lte("tanggal", sampai)).collect()).filter((x) => !x.batal);
    const pk = (await ctx.db.query("pengeluaran").withIndex("by_tanggal", (q) => q.gte("tanggal", dari).lte("tanggal", sampai)).collect()).filter((x) => !x.batal);
    const pembayaran = await Promise.all(pm.map(async (p) => ({ tanggal: p.tanggal, kas: nama.get(p.kasId) ?? "?", warga: (await ctx.db.get(p.wargaId))?.nama ?? "?", noRumah: (await ctx.db.get(p.wargaId))?.noRumah ?? "", jumlah: p.jumlah })));
    const pengeluaran = pk.map((p) => ({ tanggal: p.tanggal, kas: nama.get(p.kasId) ?? "?", keterangan: p.keterangan, jumlah: p.jumlah }));
    return { kas, pembayaran: pembayaran.sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)), pengeluaran: pengeluaran.sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1)) };
  },
});

export const tunggakan = query({
  args: { token: v.string(), kasId: v.optional(v.id("jenisKas")) },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    return await hitungTunggakan(ctx, bulanIni(), a.kasId);
  },
});
