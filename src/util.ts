export const rp = (n: number) => "Rp " + Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export function normWa(x: string) {
  let d = String(x || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}
export const validWa = (d: string) => /^62\d{8,13}$/.test(d);
const p2 = (x: number) => String(x).padStart(2, "0");
export const hariIni = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
export const bulanIni = () => hariIni().slice(0, 7);
export const geserBulan = (b: string, n: number) => { const [y, m] = b.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const namaBulan = (b: string) => `${BULAN[+b.slice(5, 7) - 1]} ${b.slice(0, 4)}`;
export const tglIndo = (s: string) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${BULAN[m - 1]} ${y}`; };
export const isiTemplate = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
export const linkWa = (no: string, pesan: string) => `https://wa.me/${no}?text=${encodeURIComponent(pesan)}`;
export const acakRentang = (a: number, b: number) => Math.round(a + Math.random() * Math.max(0, b - a));
export const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const TPL_UNDANGAN =
  "Yth. Bapak/Ibu {nama} (Rumah No. {no_rumah}),\n\nKami mengundang Bapak/Ibu pada acara {judul}:\nHari/Tanggal: {tanggal}\nPukul: {jam}\nTempat: {tempat}\n\nMohon kehadirannya. Terima kasih.\n{rt}";
export const TPL_TAGIHAN =
  "Yth. Bapak/Ibu {nama} (Rumah No. {no_rumah}),\n\nPengingat kas {rt}. Hingga saat ini masih ada tagihan:\n{rincian}\n\nTotal: {total}\n\nBila sudah membayar, abaikan pesan ini. Terima kasih.";
export const TPL_KUITANSI =
  "Kuitansi {no_kuitansi}\n{rt}\n\nTelah diterima dari {nama} (Rumah No. {no_rumah})\nKas: {kas}\nJumlah: {jumlah}\nTanggal: {tanggal}\nPetugas: {petugas}\n\nTerima kasih.";

// ---- Impor data warga (Excel / CSV / Google Sheet) ----
const ALIAS: Record<string, string> = {
  nama: "nama", nama_warga: "nama", nama_kk: "nama", nama_kepala_keluarga: "nama",
  no_rumah: "noRumah", nomor_rumah: "noRumah", rumah: "noRumah",
  no_wa: "noWa", wa: "noWa", no_hp: "noWa", hp: "noWa", whatsapp: "noWa",
  status_hunian: "statusHunian", status: "statusHunian", blok: "blok", catatan: "catatan",
};
export type Baris = { nama: string; noRumah: string; noWa: string; statusHunian: "tetap" | "kontrak"; blok?: string; catatan?: string; masalah?: string };
export function parseBaris(rows: any[]): Baris[] {
  const lihat = new Set<string>();
  return rows.map((r) => {
    const o: any = {};
    for (const k of Object.keys(r)) {
      const key = ALIAS[k.trim().toLowerCase().replace(/[\s.]+/g, "_")];
      if (key) o[key] = String(r[k] ?? "").trim();
    }
    const noWa = normWa(o.noWa || "");
    let masalah: string | undefined;
    if (!o.nama) masalah = "Nama kosong";
    else if (!o.noRumah) masalah = "No. rumah kosong";
    else if (!validWa(noWa)) masalah = "No. WA tidak valid";
    else {
      const k = (o.noRumah + "|" + o.nama).toLowerCase();
      if (lihat.has(k)) masalah = "Duplikat di file";
      lihat.add(k);
    }
    return { nama: o.nama || "", noRumah: o.noRumah || "", noWa, statusHunian: /kontrak|sewa/i.test(o.statusHunian || "") ? "kontrak" : "tetap", blok: o.blok || undefined, catatan: o.catatan || undefined, masalah };
  });
}

export const bulanPendek = (b: string) => `${BULAN[+b.slice(5, 7) - 1].slice(0, 3)} ${b.slice(0, 4)}`;
// "Nov 2026" atau "Nov 2026 s.d. Jan 2027 (3 bln)"
export function periodeTeks(list: string[] | undefined) {
  const u = [...new Set((list ?? []).filter((p) => /^\d{4}-\d{2}$/.test(p)))].sort();
  if (u.length === 0) return "";
  if (u.length === 1) return bulanPendek(u[0]);
  return `${bulanPendek(u[0])} s.d. ${bulanPendek(u[u.length - 1])} (${u.length} bln)`;
}

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function tb(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return tb(n - 10) + " belas";
  if (n < 100) return tb(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + tb(n % 10) : "");
  if (n < 200) return "seratus" + (n > 100 ? " " + tb(n - 100) : "");
  if (n < 1000) return tb(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + tb(n % 100) : "");
  if (n < 2000) return "seribu" + (n > 1000 ? " " + tb(n - 1000) : "");
  if (n < 1e6) return tb(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + tb(n % 1000) : "");
  if (n < 1e9) return tb(Math.floor(n / 1e6)) + " juta" + (n % 1e6 ? " " + tb(n % 1e6) : "");
  if (n < 1e12) return tb(Math.floor(n / 1e9)) + " miliar" + (n % 1e9 ? " " + tb(n % 1e9) : "");
  return String(n);
}
export function terbilang(n: number) {
  const x = Math.floor(Math.abs(n || 0));
  const t = x === 0 ? "nol" : tb(x);
  return t.charAt(0).toUpperCase() + t.slice(1) + " rupiah";
}
