import { Linking, Platform } from "react-native";
import { Sheet, SheetItem, jalankan } from "./ui";
import { rp, tglIndo, isiTemplate, linkWa, periodeTeks, TPL_KUITANSI } from "./util";
import { Struk, cetakRawBT, cetakStrukDialog, bagikanStrukPdf } from "./struk";
import { Bukti, cetakBukti } from "./cetak";

export type ItemCetak = { judul: string; struk: Struk; bukti: Bukti; wa?: { no: string; pesan: string } };
type Pg = Record<string, string> | undefined;

// Kuitansi pembayaran iuran (p dari transaksi.daftarBayar / pengajuan yang disetujui)
export function itemBayar(p: any, pg: Pg): ItemCetak {
  const peri = periodeTeks(p.periode);
  const baris: [string, string][] = [
    ["Dari", p.warga?.nama ?? "-"],
    ["Rumah No", String(p.warga?.noRumah ?? "-")],
    ["Untuk", p.kas],
  ];
  if (peri) baris.push(["Periode", peri]);
  if (p.metode) baris.push(["Metode", p.metode]);
  const rt = pg?.namaRT || "RT";
  const pesan = isiTemplate(pg?.tpl_kuitansi || TPL_KUITANSI, { no_kuitansi: p.noKuitansi, rt, nama: p.warga?.nama ?? "", no_rumah: p.warga?.noRumah ?? "", kas: p.kas, jumlah: rp(p.jumlah), tanggal: tglIndo(p.tanggal), petugas: p.petugas });
  return {
    judul: `Kuitansi ${p.noKuitansi}`,
    struk: { rt, alamat: pg?.alamatRT, judul: "TANDA TERIMA IURAN", nomor: p.noKuitansi, tanggal: tglIndo(p.tanggal), baris, totalLabel: "TELAH DITERIMA", total: p.jumlah, catatan: p.catatan, petugas: p.petugas },
    bukti: { judul: "KUITANSI", nomor: p.noKuitansi, tanggal: tglIndo(p.tanggal), baris: [...baris.map(([k, v]) => [k === "Dari" ? "Telah terima dari" : k === "Untuk" ? "Untuk pembayaran" : k, v] as [string, string]), ...(p.catatan ? [["Catatan", p.catatan] as [string, string]] : [])], jumlah: p.jumlah, ttd: [["Penyetor", p.warga?.nama ?? ""], ["Petugas kas", p.petugas ?? ""]] },
    wa: p.warga?.noWa ? { no: p.warga.noWa, pesan } : undefined,
  };
}

export function itemKeluar(x: any, pg: Pg): ItemCetak {
  const rt = pg?.namaRT || "RT";
  const nomor = `PK-${String(x.tanggal).replace(/-/g, "")}-${String(x._id).slice(-4).toUpperCase()}`;
  const baris: [string, string][] = [["Kas", x.kas], ["Keperluan", x.keterangan]];
  return {
    judul: "Bukti pengeluaran",
    struk: { rt, alamat: pg?.alamatRT, judul: "BUKTI PENGELUARAN", nomor, tanggal: tglIndo(x.tanggal), baris, totalLabel: "JUMLAH DIKELUARKAN", total: x.jumlah, petugas: x.petugas },
    bukti: { judul: "BUKTI PENGELUARAN KAS", nomor, tanggal: tglIndo(x.tanggal), baris: [["Kas", x.kas], ["Keperluan", x.keterangan]], jumlah: x.jumlah, ttd: [["Penerima", ""], ["Petugas kas", x.petugas ?? ""]] },
  };
}

// Pilihan cetak untuk satu kuitansi / bukti
export function MenuCetak({ item, pg, onTutup }: { item: ItemCetak | null; pg: Pg; onTutup: () => void }) {
  const it = item;
  const items: SheetItem[] = it ? [
    ...(Platform.OS === "android" ? [{ label: "Cetak struk 58 mm (RawBT)", ket: "Langsung ke printer thermal Bluetooth/USB lewat aplikasi RawBT", icon: "print" as const, onPress: () => jalankan(() => cetakRawBT(it.struk)) }] : []),
    { label: "Cetak struk 58 mm lewat dialog printer", ket: "Kertas 58 mm; pilih printer thermal Anda", icon: "receipt-outline", onPress: () => jalankan(() => cetakStrukDialog(it.struk)) },
    { label: "Bagikan struk 58 mm (PDF)", ket: "Kirim ke aplikasi printer atau simpan", icon: "share-outline", onPress: () => jalankan(() => bagikanStrukPdf(it.struk)) },
    { label: "Cetak kuitansi ukuran penuh", ket: "Printer biasa (A4) atau simpan sebagai PDF", icon: "document-text-outline", onPress: () => jalankan(() => cetakBukti(it.bukti, pg ?? {})) },
    ...(it.wa ? [{ label: "Kirim lewat WhatsApp", icon: "logo-whatsapp" as const, onPress: () => { Linking.openURL(linkWa(it.wa!.no, it.wa!.pesan)); } }] : []),
  ] : [];
  return <Sheet tampil={!!it} judul={it?.judul} sub="Pilih cara mencetak / membagikan" items={items} onTutup={onTutup} />;
}
