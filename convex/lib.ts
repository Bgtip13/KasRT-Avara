import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;
type Role = Doc<"users">["role"];

// Pesan error untuk pengguna harus lewat ConvexError (kalau tidak, di production disamarkan jadi "Server Error")
export const gagal = (m: string) => new ConvexError(m);

const enc = new TextEncoder();
const hex = (b: ArrayLike<number>) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
export const acak = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); };
export const sha256 = async (t: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(t))));
export async function hashPin(pin: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 50000, hash: "SHA-256" }, key, 256);
  return hex(new Uint8Array(bits));
}

export const pinAcak = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
export function pinLemah(pin: string) {
  return /^(\d)\1{5}$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin);
}

export function normWa(x: string) {
  let d = String(x || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}
export const validWa = (d: string) => /^62\d{8,13}$/.test(d);
export const rp = (n: number) => "Rp " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Tanggal dalam WIB (UTC+7)
export const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
export const bulanIni = () => hariIni().slice(0, 7);
export const bulanBerikut = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
};

export async function getUser(ctx: Ctx, token: string, bolehPinAwal = false) {
  const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
  if (!s || s.expiresAt < Date.now()) throw gagal("Sesi berakhir, silakan masuk lagi");
  const u = await ctx.db.get(s.userId);
  if (!u || !u.aktif) throw gagal("Akun tidak aktif");
  if (u.wajibGanti && !bolehPinAwal) throw gagal("Ganti PIN awal Anda dulu");
  return u;
}
export async function wajibRole(ctx: Ctx, token: string, roles: Role[]) {
  const u = await getUser(ctx, token);
  if (!roles.includes(u.role)) throw gagal("Anda tidak punya akses untuk ini");
  return u;
}
// Pengurus (admin, petugas, pengawas). Akun warga tidak boleh membaca data seluruh RT.
export const wajibStaf = (ctx: Ctx, token: string) => wajibRole(ctx, token, ["admin", "petugas", "pengawas"]);
export async function bolehKas(ctx: Ctx, u: Doc<"users">, kasId: Id<"jenisKas">) {
  const k = await ctx.db.get(kasId);
  if (!k || !k.aktif) throw gagal("Jenis kas tidak ditemukan");
  if (u.role === "admin") return k;
  if (u.role === "petugas" && k.petugasIds.includes(u._id)) return k;
  throw gagal("Anda bukan petugas kas ini");
}
export async function catat(ctx: MutationCtx, u: Doc<"users">, aksi: string, detail: string) {
  await ctx.db.insert("log", { userId: u._id, nama: u.nama, aksi, detail });
}

export const nominalUntuk = (k: Doc<"jenisKas">, w: Doc<"warga">) =>
  w.statusHunian === "kontrak" && k.nominalKontrak != null ? k.nominalKontrak : k.nominal;

export async function pastikanTagihan(ctx: MutationCtx, w: Doc<"warga">, k: Doc<"jenisKas">, periode: string) {
  const ada = await ctx.db.query("tagihan")
    .withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", w._id).eq("kasId", k._id).eq("periode", periode))
    .unique();
  if (ada) return ada;
  const id = await ctx.db.insert("tagihan", { wargaId: w._id, kasId: k._id, periode, nominal: nominalUntuk(k, w), terbayar: 0 });
  return (await ctx.db.get(id))!;
}

export async function buatTagihanBulan(ctx: MutationCtx, bulan: string) {
  const kas = (await ctx.db.query("jenisKas").collect()).filter((k) => k.aktif && k.periode === "bulanan");
  const warga = (await ctx.db.query("warga").collect()).filter((w) => w.aktif);
  for (const k of kas) for (const w of warga) await pastikanTagihan(ctx, w, k, bulan);
}

export async function ringkasKas(ctx: Ctx, kas: Doc<"jenisKas">, dari: string, sampai: string) {
  const pm = (await ctx.db.query("pembayaran").withIndex("by_kas", (q) => q.eq("kasId", kas._id)).collect()).filter((x) => !x.batal);
  const pk = (await ctx.db.query("pengeluaran").withIndex("by_kas", (q) => q.eq("kasId", kas._id)).collect()).filter((x) => !x.batal);
  let awal = kas.saldoAwal, masuk = 0, keluar = 0;
  for (const x of pm) { if (x.tanggal < dari) awal += x.jumlah; else if (x.tanggal <= sampai) masuk += x.jumlah; }
  for (const x of pk) { if (x.tanggal < dari) awal -= x.jumlah; else if (x.tanggal <= sampai) keluar += x.jumlah; }
  return { saldoAwal: awal, masuk, keluar, saldoAkhir: awal + masuk - keluar };
}

export async function hitungTunggakan(ctx: Ctx, sampai: string, kasId?: Id<"jenisKas">) {
  const kasList = (await ctx.db.query("jenisKas").collect()).filter((k) => k.aktif && k.periode !== "bebas" && (!kasId || k._id === kasId));
  const wargaMap = new Map((await ctx.db.query("warga").collect()).filter((w) => w.aktif).map((w) => [w._id, w] as const));
  const hasil = new Map<Id<"warga">, { warga: Doc<"warga">; total: number; baris: string[] }>();
  for (const k of kasList) {
    const per = new Map<Id<"warga">, { n: number; sisa: number }>();
    for (const t of await ctx.db.query("tagihan").withIndex("by_kas", (q) => q.eq("kasId", k._id)).collect()) {
      if (!wargaMap.has(t.wargaId) || t.terbayar >= t.nominal) continue;
      if (t.periode !== "sekali" && t.periode > sampai) continue;
      const x = per.get(t.wargaId) ?? { n: 0, sisa: 0 };
      x.n++; x.sisa += t.nominal - t.terbayar;
      per.set(t.wargaId, x);
    }
    for (const [wid, x] of per) {
      const h = hasil.get(wid) ?? { warga: wargaMap.get(wid)!, total: 0, baris: [] as string[] };
      h.total += x.sisa;
      h.baris.push(k.periode === "bulanan" ? `${k.nama}: ${x.n} bulan (${rp(x.sisa)})` : `${k.nama}: ${rp(x.sisa)}`);
      hasil.set(wid, h);
    }
  }
  return [...hasil.values()]
    .map((h) => ({ warga: h.warga, total: h.total, rincian: h.baris.join("\n") }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------- Alokasi pembayaran
type Alokasi = { tagihanId: Id<"tagihan">; jumlah: number }[];

// Pembayaran dialokasikan ke tagihan tertua yang belum lunas, lalu ke bulan-bulan berikutnya (bayar di muka)
export async function alokasikanBayar(ctx: MutationCtx, w: Doc<"warga">, kas: Doc<"jenisKas">, jumlah: number): Promise<Alokasi> {
  let sisa = jumlah;
  const alokasi: Alokasi = [];
  if (kas.periode === "bebas") return alokasi;
  const ada = (await ctx.db.query("tagihan").withIndex("by_warga_kas_periode", (q) => q.eq("wargaId", w._id).eq("kasId", kas._id)).collect())
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
  return alokasi;
}

// Mengembalikan alokasi pembayaran (dipakai saat batal, ubah, hapus)
export async function batalkanAlokasi(ctx: MutationCtx, alokasi: Alokasi) {
  for (const al of alokasi) {
    const t = await ctx.db.get(al.tagihanId);
    if (t) await ctx.db.patch(t._id, { terbayar: Math.max(0, t.terbayar - al.jumlah) });
  }
}

export async function simpanPembayaran(
  ctx: MutationCtx, u: Doc<"users">, w: Doc<"warga">, kas: Doc<"jenisKas">,
  a: { jumlah: number; tanggal: string; metode?: string; catatan?: string },
) {
  const alokasi = await alokasikanBayar(ctx, w, kas, a.jumlah);
  const noKuitansi = `KR-${a.tanggal.replace(/-/g, "")}-${acak(2).toUpperCase()}`;
  const id = await ctx.db.insert("pembayaran", { wargaId: w._id, kasId: kas._id, jumlah: a.jumlah, tanggal: a.tanggal, petugasId: u._id, metode: a.metode, catatan: a.catatan, alokasi, noKuitansi, batal: false });
  await catat(ctx, u, "Catat pembayaran", `${noKuitansi} ${kas.nama} ${w.nama} Rp${a.jumlah}${a.metode ? ` (${a.metode})` : ""}`);
  return { id, noKuitansi };
}

// ---------------------------------------------------------------- Undangan acara
// Antrean undangan dibuat saat acara dibuat. Warga yang baru ditambah / diaktifkan sesudahnya tidak ikut, sehingga daftar kirim
// undangan WhatsApp tampak kosong ("data warga tidak ditemukan"). Fungsi ini melengkapi antrean tanpa menggandakan.
export async function lengkapiUndangan(ctx: MutationCtx, eventId: Id<"event">) {
  const ada = new Set((await ctx.db.query("antrean").withIndex("by_event", (q) => q.eq("eventId", eventId).eq("jenis", "undangan")).collect()).map((x) => x.wargaId));
  let n = 0;
  for (const w of (await ctx.db.query("warga").collect()).filter((w) => w.aktif && !ada.has(w._id))) {
    await ctx.db.insert("antrean", { jenis: "undangan", eventId, wargaId: w._id, status: "menunggu" });
    n++;
  }
  return n;
}

// Warga baru / diaktifkan: masukkan ke antrean undangan acara yang belum lewat
export async function undangWargaKeAcaraMendatang(ctx: MutationCtx, wargaId: Id<"warga">) {
  const evs = await ctx.db.query("event").withIndex("by_tanggal", (q) => q.gte("tanggal", hariIni())).collect();
  for (const ev of evs) {
    const ada = (await ctx.db.query("antrean").withIndex("by_event", (q) => q.eq("eventId", ev._id).eq("jenis", "undangan")).collect()).some((x) => x.wargaId === wargaId);
    if (!ada) await ctx.db.insert("antrean", { jenis: "undangan", eventId: ev._id, wargaId, status: "menunggu" });
  }
}
