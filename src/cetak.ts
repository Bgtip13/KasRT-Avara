import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { esc, isiTemplate, rp, tglIndo, namaBulan, TPL_UNDANGAN } from "./util";

const CSS = `body{font-family:Helvetica,Arial,sans-serif;color:#14221D;font-size:13px}
.page{page-break-after:always;padding:36px 28px}.page:last-child{page-break-after:auto}
.kop{text-align:center;border-bottom:2px solid #0F5C4A;padding-bottom:10px;margin-bottom:22px}
.kop b{font-size:18px}h2{text-align:center;letter-spacing:2px;margin:6px 0 24px}
.isi{line-height:1.7;font-size:15px;margin:22px 0}.ttd{margin-top:48px;text-align:right}
table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left}
th{background:#D5E6DE}td.r,th.r{text-align:right}h3{margin:16px 0 4px}`;

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
