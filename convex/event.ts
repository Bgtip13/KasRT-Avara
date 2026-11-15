import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { getUser, wajibStaf, wajibRole, catat, gagal, hariIni, bulanIni, buatTagihanBulan, hitungTunggakan } from "./lib";

const isi = { judul: v.string(), tanggal: v.string(), jam: v.optional(v.string()), tempat: v.string(), deskripsi: v.optional(v.string()) };

export const daftar = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await wajibStaf(ctx, token);
    const evs = await ctx.db.query("event").withIndex("by_tanggal").order("desc").take(40);
    return await Promise.all(evs.map(async (e) => {
      const und = await ctx.db.query("antrean").withIndex("by_event", (q) => q.eq("eventId", e._id).eq("jenis", "undangan")).collect();
      return { ...e, undanganTotal: und.length, undanganTerkirim: und.filter((x) => x.status === "terkirim").length };
    }));
  },
});

// Daftar acara untuk semua pengguna (termasuk warga): hanya info dasar, tanpa data antrean/penagihan
export const untukWarga = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await getUser(ctx, token);
    const evs = await ctx.db.query("event").withIndex("by_tanggal").order("desc").take(30);
    return evs.map((e) => ({ _id: e._id, judul: e.judul, tanggal: e.tanggal, jam: e.jam, tempat: e.tempat, deskripsi: e.deskripsi }));
  },
});

export const buat = mutation({
  args: { token: v.string(), id: v.optional(v.id("event")), ...isi },
  handler: async (ctx, { token, id, ...a }) => {
    const me = await wajibRole(ctx, token, ["admin"]);
    if (!a.judul.trim() || !a.tempat.trim()) throw gagal("Judul dan tempat wajib diisi");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.tanggal)) throw gagal("Format tanggal harus YYYY-MM-DD");
    if (id) { await ctx.db.patch(id, a); await catat(ctx, me, "Ubah acara", a.judul); return id; }
    const eid = await ctx.db.insert("event", { ...a, diproses: false });
    // Otomatis siapkan antrean undangan untuk semua warga aktif
    for (const w of (await ctx.db.query("warga").collect()).filter((w) => w.aktif))
      await ctx.db.insert("antrean", { jenis: "undangan", eventId: eid, wargaId: w._id, status: "menunggu" });
    await catat(ctx, me, "Buat acara", `${a.judul} (${a.tanggal})`);
    return eid;
  },
});

export const detail = query({
  args: { token: v.string(), eventId: v.id("event") },
  handler: async (ctx, a) => {
    await wajibStaf(ctx, a.token);
    const event = await ctx.db.get(a.eventId);
    if (!event) return null;
    const ambil = async (jenis: "undangan" | "tagihan") => {
      const rows = await ctx.db.query("antrean").withIndex("by_event", (q) => q.eq("eventId", a.eventId).eq("jenis", jenis)).collect();
      const out = [];
      for (const r of rows) { const w = await ctx.db.get(r.wargaId); if (w) out.push({ ...r, warga: w }); }
      return out.sort((x, y) => x.warga.noRumah.localeCompare(y.warga.noRumah, "id", { numeric: true }));
    };
    return { event, undangan: await ambil("undangan"), tagihan: await ambil("tagihan") };
  },
});

export const tandai = mutation({
  args: { token: v.string(), antreanId: v.id("antrean") },
  handler: async (ctx, a) => {
    await wajibRole(ctx, a.token, ["admin"]);
    await ctx.db.patch(a.antreanId, { status: "terkirim", terkirimPada: Date.now() });
  },
});

// H+1 setelah acara: pastikan tagihan bulan itu ada, lalu antrekan pengingat untuk warga yang belum lunas
async function prosesEvent(ctx: MutationCtx, ev: Doc<"event">) {
  const bulan = ev.tanggal.slice(0, 7);
  await buatTagihanBulan(ctx, bulan);
  for (const t of await hitungTunggakan(ctx, bulan))
    await ctx.db.insert("antrean", { jenis: "tagihan", eventId: ev._id, wargaId: t.warga._id, status: "menunggu", rincian: t.rincian, total: t.total });
  await ctx.db.patch(ev._id, { diproses: true });
}

export const prosesTagihan = mutation({
  args: { token: v.string(), eventId: v.id("event") },
  handler: async (ctx, a) => {
    const me = await wajibRole(ctx, a.token, ["admin"]);
    const ev = await ctx.db.get(a.eventId);
    if (!ev) throw gagal("Acara tidak ditemukan");
    if (ev.diproses) throw gagal("Tagihan acara ini sudah diproses");
    await prosesEvent(ctx, ev);
    await catat(ctx, me, "Proses tagihan manual", ev.judul);
  },
});

export const prosesOtomatis = internalMutation({
  args: {},
  handler: async (ctx) => {
    const evs = await ctx.db.query("event").withIndex("by_tanggal", (q) => q.lt("tanggal", hariIni())).filter((q) => q.eq(q.field("diproses"), false)).collect();
    for (const ev of evs) await prosesEvent(ctx, ev);
  },
});

export const generateBulanan = internalMutation({
  args: {},
  handler: async (ctx) => { await buatTagihanBulan(ctx, bulanIni()); },
});
