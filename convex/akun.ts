import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getUser, bulanIni } from "./lib";

// "Akun saya": ringkasan tagihan & riwayat pembayaran untuk warga yang sedang masuk.
// Hanya membaca data milik warga yang terhubung dengan akun ini (users.wargaId), tidak pernah data warga lain.
export const ringkasan = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    const w = u.wargaId ? await ctx.db.get(u.wargaId) : null;
    if (!w) return { terhubung: false as const };

    const bulan = bulanIni();
    const kasMap = new Map((await ctx.db.query("jenisKas").collect()).map((k) => [k._id, k] as const));
    const tagihan = await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", w._id)).collect();

    const per = new Map<Id<"jenisKas">, typeof tagihan>();
    for (const t of tagihan) per.set(t.kasId, [...(per.get(t.kasId) ?? []), t]);

    let totalTunggakan = 0;
    const kas = [];
    for (const [kasId, ts] of per) {
      const k = kasMap.get(kasId);
      if (!k || !k.aktif || k.periode === "bebas") continue;
      const urut = [...ts].sort((x, y) => (x.periode < y.periode ? -1 : 1));
      const belum = urut.filter((t) => t.terbayar < t.nominal && (t.periode === "sekali" || t.periode <= bulan));
      const sisa = belum.reduce((s, t) => s + t.nominal - t.terbayar, 0);
      totalTunggakan += sisa;
      const lunasTerakhir = [...urut].reverse().find((t) => t.periode !== "sekali" && t.terbayar >= t.nominal)?.periode;
      const bulanIniT = urut.find((t) => t.periode === bulan);
      kas.push({
        kasId, nama: k.nama, periode: k.periode, urutan: k.urutan,
        jumlahTagihan: belum.length, sisa,
        daftarPeriode: belum.filter((t) => t.periode !== "sekali").map((t) => t.periode),
        statusBulanIni: k.periode !== "bulanan" ? null : !bulanIniT ? "belum-ditagih" : bulanIniT.terbayar >= bulanIniT.nominal ? "lunas" : "belum",
        lunasSampai: k.periode === "bulanan" ? lunasTerakhir ?? null : null,
      });
    }
    kas.sort((x, y) => x.urutan - y.urutan);

    const rows = await ctx.db.query("pembayaran").withIndex("by_warga", (q) => q.eq("wargaId", w._id)).order("desc").take(200);
    const riwayat = await Promise.all(rows.map(async (p) => ({
      _id: p._id, tanggal: p.tanggal, jumlah: p.jumlah, noKuitansi: p.noKuitansi, metode: p.metode ?? null,
      batal: p.batal, alasanBatal: p.alasanBatal ?? null,
      kas: kasMap.get(p.kasId)?.nama ?? "?",
      petugas: (await ctx.db.get(p.petugasId))?.nama ?? "?",
    })));
    riwayat.sort((x, y) => (x.tanggal === y.tanggal ? 0 : x.tanggal < y.tanggal ? 1 : -1));
    const tahun = bulan.slice(0, 4);
    const dibayarTahunIni = riwayat.filter((x) => !x.batal && x.tanggal.startsWith(tahun)).reduce((s, x) => s + x.jumlah, 0);

    return {
      terhubung: true as const,
      warga: { nama: w.nama, noRumah: w.noRumah, blok: w.blok ?? null, statusHunian: w.statusHunian },
      bulan, totalTunggakan, dibayarTahunIni, kas, riwayat,
    };
  },
});
