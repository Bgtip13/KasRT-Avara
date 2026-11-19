import { useState } from "react";
import { Linking, View } from "react-native";
import { useQ } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Chip, Tunggu, Kosong, SearchBar, C, jalankan } from "../src/ui";
import { rp, bulanIni, geserBulan, namaBulan, tglIndo, isiTemplate, linkWa, TPL_TAGIHAN } from "../src/util";
import { cetakLaporan, cetakTunggakan } from "../src/cetak";

export default function Laporan() {
  const [tab, setTab] = useState<"bulanan" | "tunggakan">("bulanan");
  const [bulan, setBulan] = useState(bulanIni());
  const [cari, setCari] = useState("");
  const d = useQ(api.laporan.bulanan, { bulan });
  const tg = useQ(api.laporan.tunggakan);
  const pg = useQ(api.pengaturan.ambil);

  const ingatkan = (t: any) => Linking.openURL(linkWa(t.warga.noWa, isiTemplate(pg?.tpl_tagihan || TPL_TAGIHAN, { nama: t.warga.nama, no_rumah: t.warga.noRumah, rt: pg?.namaRT || "RT", rincian: t.rincian, total: rp(t.total) })));

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Rekap bulanan" aktif={tab === "bulanan"} onPress={() => setTab("bulanan")} />
        <Chip label="Tunggakan" aktif={tab === "tunggakan"} onPress={() => setTab("tunggakan")} />
      </View>
      {tab === "bulanan" && (<>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Btn kind="ghost" label="‹" onPress={() => setBulan(geserBulan(bulan, -1))} />
          <T b size={17}>{namaBulan(bulan)}</T>
          <Btn kind="ghost" label="›" onPress={() => setBulan(geserBulan(bulan, 1))} />
        </View>
        {!d || !pg ? <Tunggu /> : (<>
          {d.kas.map((k: any) => (
            <Card key={k._id}>
              <T b>{k.nama}</T>
              <T size={13} c={C.muted}>Saldo awal {rp(k.saldoAwal)}</T>
              <T size={13} c={C.primary}>Masuk {rp(k.masuk)}</T>
              <T size={13} c={C.danger}>Keluar {rp(k.keluar)}</T>
              <T b>Saldo akhir {rp(k.saldoAkhir)}</T>
            </Card>
          ))}
          <Card>
            <T b>Pengeluaran bulan ini</T>
            {d.pengeluaran.length === 0 ? <T size={13} c={C.muted}>Tidak ada.</T> : d.pengeluaran.map((x: any, i: number) => <T key={i} size={13}>{tglIndo(x.tanggal)} · {x.kas} · {x.keterangan} · {rp(x.jumlah)}</T>)}
          </Card>
          <T size={13} c={C.muted}>{d.pembayaran.length} transaksi pembayaran bulan ini.</T>
          <Btn label="Bagikan laporan (PDF)" onPress={() => jalankan(() => cetakLaporan(bulan, d, pg))} />
        </>)}
      </>)}
      {tab === "tunggakan" && (!tg ? <Tunggu /> : tg.length === 0 ? <Kosong ikon="checkmark-circle-outline" teks="Tidak ada tunggakan sampai bulan ini." /> : (() => {
        const q = cari.trim().toLowerCase();
        const hasil = tg.filter((t: any) => !q || (t.warga.nama + " " + t.warga.noRumah).toLowerCase().includes(q));
        return (<>
          <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama atau nomor rumah" />
          <Btn icon="print-outline" kind="soft" label="Cetak daftar tunggakan" onPress={() => jalankan(() => cetakTunggakan(hasil, pg ?? {}))} />
          {hasil.length === 0 ? <Kosong teks="Tidak ada yang cocok." /> : hasil.map((t: any) => (
            <Card key={t.warga._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T b>{t.warga.nama} ({t.warga.noRumah})</T><T b c={C.danger}>{rp(t.total)}</T></View>
              <T size={13} c={C.muted}>{t.rincian}</T>
              <Btn kind="ghost" icon="logo-whatsapp" label="Ingatkan lewat WA" onPress={() => ingatkan(t)} s={{ marginTop: 6 }} small />
            </Card>
          ))}
        </>);
      })())}
    </Screen>
  );
}
