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
