import { Alert, Linking, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { esc, rp } from "./util";

// Struk printer thermal 58 mm (lebar cetak sekitar 48 mm = 32 karakter per baris).
// Tiga jalur cetak:
//  1) RawBT (Android): data ESC/POS dikirim ke aplikasi RawBT yang tersambung ke printer Bluetooth/USB. Paling cepat dan tajam.
//  2) Dialog cetak sistem: HTML berukuran kertas 58 mm, untuk printer yang punya print service sendiri.
//  3) PDF 58 mm: dibagikan ke aplikasi printer pilihan Anda.

export type Struk = {
  rt: string; alamat?: string;
  judul: string; nomor: string; tanggal: string;
  baris: [string, string][];
  totalLabel: string; total: number;
  catatan?: string; petugasLabel?: string; petugas?: string; footer?: string;
};

const LEBAR = 32;

/* ----------------------------------------------------------------- ESC/POS */

const ascii = (t: any) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");

function bungkus(t: string, n = LEBAR): string[] {
  const out: string[] = [];
  let cur = "";
  for (const kata of ascii(t).split(/\s+/).filter(Boolean)) {
    let k = kata;
    while (k.length > n) { if (cur) { out.push(cur); cur = ""; } out.push(k.slice(0, n)); k = k.slice(n); }
    if (!cur) cur = k;
    else if ((cur + " " + k).length <= n) cur += " " + k;
    else { out.push(cur); cur = k; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

function kiriKanan(k: string, v: string): string[] {
  const a = ascii(k), b = ascii(v);
  if (a.length + b.length + 1 <= LEBAR) return [a + " ".repeat(LEBAR - a.length - b.length) + b];
  // terlalu panjang: label di satu baris, nilai rata kanan di baris berikutnya
  return [...bungkus(a), ...bungkus(b).map((x) => " ".repeat(Math.max(0, LEBAR - x.length)) + x)];
}

export function escpos(s: Struk): Uint8Array {
  const o: number[] = [];
  const cmd = (...b: number[]) => o.push(...b);
  const teks = (t: string) => { for (const ch of ascii(t)) o.push(ch.charCodeAt(0)); cmd(0x0a); };
  const garis = () => teks("-".repeat(LEBAR));
  const tengah = (t: string) => { cmd(0x1b, 0x61, 1); for (const l of bungkus(t)) teks(l); cmd(0x1b, 0x61, 0); };

  cmd(0x1b, 0x40);                 // init
  cmd(0x1b, 0x45, 1); tengah(s.rt); cmd(0x1b, 0x45, 0);
  if (s.alamat) tengah(s.alamat);
  garis();
  cmd(0x1b, 0x45, 1); tengah(s.judul); cmd(0x1b, 0x45, 0);
  for (const l of kiriKanan("No", s.nomor)) teks(l);
  for (const l of kiriKanan("Tanggal", s.tanggal)) teks(l);
  garis();
  for (const [k, v] of s.baris) for (const l of kiriKanan(k, v)) teks(l);
  garis();
  cmd(0x1b, 0x61, 1); teks(ascii(s.totalLabel)); cmd(0x1d, 0x21, 0x11, 0x1b, 0x45, 1); teks(ascii(rp(s.total))); cmd(0x1d, 0x21, 0x00, 0x1b, 0x45, 0, 0x1b, 0x61, 0);
  garis();
  if (s.catatan) { for (const l of bungkus("Catatan: " + s.catatan)) teks(l); }
  if (s.petugas) tengah(`${s.petugasLabel ?? "Petugas"}: ${s.petugas}`);
  tengah(s.footer ?? "Terima kasih");
  cmd(0x1b, 0x64, 4);              // umpan kertas 4 baris
  return Uint8Array.from(o);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64(b: Uint8Array) {
  let r = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    r += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
  }
  return r;
}

// Kirim ke aplikasi RawBT (Android)
export async function cetakRawBT(s: Struk) {
  if (Platform.OS !== "android") { Alert.alert("Hanya Android", "Cetak langsung lewat RawBT hanya tersedia di Android. Pakai “Cetak lewat dialog printer” atau “Bagikan PDF 58 mm”."); return; }
  try {
    await Linking.openURL(`rawbt:base64,${base64(escpos(s))}`);
  } catch {
    Alert.alert("RawBT belum terpasang", "Pasang aplikasi RawBT (gratis) dari Play Store, sambungkan printer thermal 58 mm di aplikasi itu, lalu coba lagi.", [
      { text: "Buka Play Store", onPress: () => Linking.openURL("https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter") },
      { text: "Tutup", style: "cancel" },
    ]);
  }
}

/* ----------------------------------------------------------------- HTML / PDF 58 mm */

const LEBAR_PT = 164; // 58 mm pada 72 dpi

export function struk58Html(s: Struk) {
  const baris = s.baris.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join("");
  return `<html><head><meta charset="utf-8"><style>
@page{margin:0}
body{margin:0;padding:6px 8px;width:${LEBAR_PT - 16}px;font-family:"Courier New",monospace;font-size:9px;color:#000;line-height:1.35}
.c{text-align:center}.b{font-weight:bold}hr{border:0;border-top:1px dashed #000;margin:5px 0}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:1px 0}td.k{width:42%}td.v{text-align:right}
.tot{font-size:15px;font-weight:bold;margin:2px 0}
</style></head><body>
<div class="c b" style="font-size:11px">${esc(s.rt)}</div>${s.alamat ? `<div class="c">${esc(s.alamat)}</div>` : ""}<hr>
<div class="c b">${esc(s.judul)}</div>
<table><tr><td class="k">No</td><td class="v">${esc(s.nomor)}</td></tr><tr><td class="k">Tanggal</td><td class="v">${esc(s.tanggal)}</td></tr></table><hr>
<table>${baris}</table><hr>
<div class="c">${esc(s.totalLabel)}</div><div class="c tot">${esc(rp(s.total))}</div><hr>
${s.catatan ? `<div>Catatan: ${esc(s.catatan)}</div>` : ""}
${s.petugas ? `<div class="c">${esc(s.petugasLabel ?? "Petugas")}: ${esc(s.petugas)}</div>` : ""}
<div class="c" style="margin-top:3px">${esc(s.footer ?? "Terima kasih")}</div>
</body></html>`;
}

const tinggi = (s: Struk) => Math.round(150 + s.baris.length * 22 + (s.catatan ? 24 : 0) + (s.alamat ? 14 : 0));

export async function cetakStrukDialog(s: Struk) {
  await Print.printAsync({ html: struk58Html(s), width: LEBAR_PT, height: tinggi(s) });
}

export async function bagikanStrukPdf(s: Struk) {
  const { uri } = await Print.printToFileAsync({ html: struk58Html(s), width: LEBAR_PT, height: tinggi(s) });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
