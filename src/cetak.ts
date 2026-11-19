import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { esc, isiTemplate, rp, tglIndo, namaBulan, terbilang, TPL_UNDANGAN } from "./util";

const CSS = `body{font-family:Helvetica,Arial,sans-serif;color:#0F1B3D;font-size:13px}
.page{page-break-after:always;padding:36px 28px}.page:last-child{page-break-after:auto}
.kop{text-align:center;border-bottom:2px solid #1D4ED8;padding-bottom:10px;margin-bottom:22px}
.kop b{font-size:18px}h2{text-align:center;letter-spacing:2px;margin:6px 0 24px}
.isi{line-height:1.7;font-size:15px;margin:22px 0}.ttd{margin-top:48px;text-align:right}
table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left}
th{background:#DCE8FF}td.r,th.r{text-align:right}h3{margin:16px 0 4px}`;

const logo = (p: Record<string, string>) => (p.logoUrl ? `<img src="${esc(p.logoUrl)}" style="height:64px;margin-bottom:6px"><br>` : "");

async function pdf(html: string) {
  const { uri } = await Print.printToFileAsync({ html: `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>` });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}

// Satu halaman per warga, nama & nomor rumah terisi otomatis
export async function cetakUndangan(warga: any[], ev: any, p: Record<string, string>) {
  const tpl = p.tpl_undangan || TPL_UNDANGAN;
  const halaman = warga.map((w) => {
    const isi = isiTemplate(tpl, { nama: w.nama, no_rumah: w.noRumah, judul: ev.judul, tanggal: tglIndo(ev.tanggal), jam: ev.jam || "-", tempat: ev.tempat, rt: p.namaRT || "RT" });
    return `<div class="page"><div class="kop">${logo(p)}<b>${esc(p.namaRT || "RT")}</b><br>${esc(p.alamatRT || "")}</div><h2>UNDANGAN</h2>
      <div>Kepada Yth.<br><b>${esc(w.nama)}</b><br>Rumah No. ${esc(w.noRumah)}</div>
      <div class="isi">${esc(isi).replace(/\n/g, "<br>")}</div>
      <div class="ttd">Hormat kami,<br><br><br><br><b>${esc(p.ketua || "")}</b><br>${esc(p.sebutanKetua || "Ketua RT")}</div></div>`;
  });
  await pdf(halaman.join(""));
}

export async function cetakLaporan(bulan: string, d: any, p: Record<string, string>) {
  const kas = d.kas.map((k: any) => `<tr><td>${esc(k.nama)}</td><td class="r">${rp(k.saldoAwal)}</td><td class="r">${rp(k.masuk)}</td><td class="r">${rp(k.keluar)}</td><td class="r"><b>${rp(k.saldoAkhir)}</b></td></tr>`).join("");
  const masuk = d.pembayaran.map((x: any) => `<tr><td>${tglIndo(x.tanggal)}</td><td>${esc(x.kas)}</td><td>${esc(x.warga)} (${esc(x.noRumah)})</td><td class="r">${rp(x.jumlah)}</td></tr>`).join("");
  const keluar = d.pengeluaran.map((x: any) => `<tr><td>${tglIndo(x.tanggal)}</td><td>${esc(x.kas)}</td><td>${esc(x.keterangan)}</td><td class="r">${rp(x.jumlah)}</td></tr>`).join("");
  await pdf(`<div class="page"><div class="kop">${logo(p)}<b>LAPORAN KAS ${esc(p.namaRT || "RT")}</b><br>Periode ${namaBulan(bulan)}</div>
    <h3>Ringkasan saldo</h3><table><tr><th>Kas</th><th class="r">Saldo awal</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Saldo akhir</th></tr>${kas}</table>
    <h3>Pemasukan</h3><table><tr><th>Tanggal</th><th>Kas</th><th>Warga</th><th class="r">Jumlah</th></tr>${masuk || "<tr><td colspan=4>-</td></tr>"}</table>
    <h3>Pengeluaran</h3><table><tr><th>Tanggal</th><th>Kas</th><th>Keterangan</th><th class="r">Jumlah</th></tr>${keluar || "<tr><td colspan=4>-</td></tr>"}</table>
    <div class="ttd">Bendahara<br><br><br><br><b>${esc(p.bendahara || "")}</b></div></div>`);
}

/* ------------------------------------------------------------------ Cetak catatan (dialog cetak sistem) */

async function cetakDialog(html: string) {
  await Print.printAsync({ html: `<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>` });
}
const kopHtml = (p: Record<string, string>) => `<div class="kop">${logo(p)}<b>${esc(p.namaRT || "RT")}</b><br>${esc(p.alamatRT || "")}</div>`;
const ttdDua = (a: [string, string], b: [string, string]) =>
  `<table style="border:0;margin-top:40px"><tr><td style="border:0;text-align:center;width:50%">${esc(a[0])}<br><br><br><br><b>${esc(a[1] || "........................")}</b></td><td style="border:0;text-align:center">${esc(b[0])}<br><br><br><br><b>${esc(b[1] || "........................")}</b></td></tr></table>`;

export type Bukti = { judul: string; nomor: string; tanggal: string; baris: [string, string][]; jumlah: number; ttd: [[string, string], [string, string]] };

// Kuitansi / bukti pengeluaran ukuran halaman penuh (dicetak ke printer biasa atau disimpan sebagai PDF)
export async function cetakBukti(b: Bukti, p: Record<string, string>) {
  const baris = b.baris.map(([k, v]) => `<tr><td style="width:34%"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("");
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>${esc(b.judul)}</h2>
    <table><tr><td style="width:34%"><b>Nomor</b></td><td>${esc(b.nomor)}</td></tr><tr><td><b>Tanggal</b></td><td>${esc(b.tanggal)}</td></tr>${baris}
    <tr><td><b>Jumlah</b></td><td style="font-size:18px"><b>${rp(b.jumlah)}</b></td></tr>
    <tr><td><b>Terbilang</b></td><td><i>${esc(terbilang(b.jumlah))}</i></td></tr></table>
    ${ttdDua(b.ttd[0], b.ttd[1])}</div>`);
}

export async function cetakWarga(w: any, p: Record<string, string>) {
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>DATA WARGA</h2>
    <table><tr><td style="width:34%"><b>Nama kepala keluarga</b></td><td>${esc(w.nama)}</td></tr><tr><td><b>Nomor rumah</b></td><td>${esc(w.noRumah)}</td></tr>
    <tr><td><b>Blok</b></td><td>${esc(w.blok || "-")}</td></tr><tr><td><b>No. WhatsApp</b></td><td>${esc(w.noWa)}</td></tr>
    <tr><td><b>Status hunian</b></td><td>${esc(w.statusHunian)}</td></tr><tr><td><b>Status</b></td><td>${w.aktif ? "Aktif" : "Nonaktif"}</td></tr>
    <tr><td><b>Catatan</b></td><td>${esc(w.catatan || "-")}</td></tr></table>
    <div class="ttd">${esc(p.sebutanKetua || "Ketua RT")}<br><br><br><br><b>${esc(p.ketua || "")}</b></div></div>`);
}

export async function cetakDaftarWarga(list: any[], p: Record<string, string>) {
  const rows = list.map((w, i) => `<tr><td>${i + 1}</td><td>${esc(w.noRumah)}</td><td>${esc(w.nama)}</td><td>${esc(w.blok || "")}</td><td>${esc(w.noWa)}</td><td>${esc(w.statusHunian)}${w.aktif ? "" : " (nonaktif)"}</td></tr>`).join("");
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>DAFTAR WARGA</h2><div>Jumlah: ${list.length} warga</div>
    <table><tr><th>No</th><th>No. Rumah</th><th>Nama</th><th>Blok</th><th>WhatsApp</th><th>Hunian</th></tr>${rows || "<tr><td colspan=6>-</td></tr>"}</table></div>`);
}

export async function cetakAcara(ev: any, p: Record<string, string>, undangan?: any[]) {
  const daftar = undangan && undangan.length
    ? `<h3>Daftar undangan</h3><table><tr><th>No</th><th>No. Rumah</th><th>Nama</th><th>Status</th></tr>${undangan.map((x: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(x.warga.noRumah)}</td><td>${esc(x.warga.nama)}</td><td>${x.status === "terkirim" ? "Terkirim" : "Belum"}</td></tr>`).join("")}</table>`
    : (ev.undanganTotal != null ? `<div>Undangan terkirim ${ev.undanganTerkirim} dari ${ev.undanganTotal} warga.</div>` : "");
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>INFORMASI ACARA</h2>
    <table><tr><td style="width:34%"><b>Acara</b></td><td>${esc(ev.judul)}</td></tr><tr><td><b>Tanggal</b></td><td>${tglIndo(ev.tanggal)}</td></tr>
    <tr><td><b>Pukul</b></td><td>${esc(ev.jam || "-")}</td></tr><tr><td><b>Tempat</b></td><td>${esc(ev.tempat)}</td></tr>
    <tr><td><b>Keterangan</b></td><td>${esc(ev.deskripsi || "-")}</td></tr></table>${daftar}
    <div class="ttd">${esc(p.sebutanKetua || "Ketua RT")}<br><br><br><br><b>${esc(p.ketua || "")}</b></div></div>`);
}

const NAMA_PERIODE: Record<string, string> = { bulanan: "Per bulan", sekali: "Sekali bayar", bebas: "Bebas / sukarela" };
export async function cetakKas(k: any, p: Record<string, string>) {
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>JENIS KAS</h2>
    <table><tr><td style="width:34%"><b>Nama kas</b></td><td>${esc(k.nama)}${k.aktif ? "" : " (nonaktif)"}</td></tr><tr><td><b>Jenis pembayaran</b></td><td>${NAMA_PERIODE[k.periode] || ""}</td></tr>
    <tr><td><b>Nominal</b></td><td>${k.periode === "bebas" ? "-" : rp(k.nominal)}</td></tr>
    <tr><td><b>Nominal warga kontrak</b></td><td>${k.nominalKontrak != null ? rp(k.nominalKontrak) : "-"}</td></tr>
    <tr><td><b>Saldo awal</b></td><td>${rp(k.saldoAwal)}</td></tr><tr><td><b>Saldo saat ini</b></td><td><b>${rp(k.saldo)}</b></td></tr>
    <tr><td><b>Petugas</b></td><td>${esc((k.namaPetugas || []).join(", ") || "-")}</td></tr></table>
    <div class="ttd">${esc(p.bendahara ? "Bendahara" : "Mengetahui")}<br><br><br><br><b>${esc(p.bendahara || "")}</b></div></div>`);
}

export async function cetakTunggakan(list: any[], p: Record<string, string>) {
  const rows = list.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.warga.noRumah)}</td><td>${esc(t.warga.nama)}</td><td>${esc(t.rincian).replace(/\n/g, "<br>")}</td><td class="r">${rp(t.total)}</td></tr>`).join("");
  const total = list.reduce((s, t) => s + t.total, 0);
  await cetakDialog(`<div class="page">${kopHtml(p)}<h2>DAFTAR TUNGGAKAN</h2>
    <table><tr><th>No</th><th>No. Rumah</th><th>Nama</th><th>Rincian</th><th class="r">Total</th></tr>${rows || "<tr><td colspan=5>-</td></tr>"}
    <tr><td colspan=4><b>Jumlah</b></td><td class="r"><b>${rp(total)}</b></td></tr></table></div>`);
}
