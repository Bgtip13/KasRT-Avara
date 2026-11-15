import { useState } from "react";
import { Alert, Linking, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Chip, Chips, Kosong, Tunggu, AlasanModal, Badge, C, jalankan } from "../../src/ui";
import { rp, tglIndo, isiTemplate, linkWa, TPL_KUITANSI } from "../../src/util";
import { RiwayatWarga } from "../../src/warga-views";

export default function Transaksi() {
  const { user } = useSesi();
  return user?.role === "warga" ? <RiwayatWarga /> : <TransaksiStaf />;
}

function TransaksiStaf() {
  const { user } = useSesi();
  const r = useRouter();
  const [tab, setTab] = useState<"masuk" | "keluar">("masuk");
  const [kasId, setKasId] = useState<string | undefined>();
  const [batal, setBatal] = useState<any>(null);
  const kas = useQ(api.kas.daftar);
  const pm = useQ(api.transaksi.daftarBayar, { kasId });
  const pk = useQ(api.transaksi.daftarKeluar, { kasId });
  const pg = useQ(api.pengaturan.ambil);
  const batalBayar = useM(api.transaksi.batalBayar);
  const batalKeluar = useM(api.transaksi.batalKeluar);
  const bisa = user?.role === "admin" || user?.role === "petugas";
  const data = tab === "masuk" ? pm : pk;

  const kuitansi = (p: any) => {
    const pesan = isiTemplate(pg?.tpl_kuitansi || TPL_KUITANSI, { no_kuitansi: p.noKuitansi, rt: pg?.namaRT || "RT", nama: p.warga?.nama ?? "", no_rumah: p.warga?.noRumah ?? "", kas: p.kas, jumlah: rp(p.jumlah), tanggal: tglIndo(p.tanggal), petugas: p.petugas });
    Linking.openURL(linkWa(p.warga?.noWa ?? "", pesan));
  };
  const menu = (x: any) => {
    if (x.batal) return;
    const aksi: any[] = [];
    if (tab === "masuk") aksi.push({ text: "Kirim kuitansi WA", onPress: () => kuitansi(x) });
    if (bisa) aksi.push({ text: "Batalkan", style: "destructive", onPress: () => setBatal(x) });
    aksi.push({ text: "Tutup", style: "cancel" });
    Alert.alert(tab === "masuk" ? x.noKuitansi : x.keterangan, undefined, aksi);
  };

  return (
    <Screen tab title="Transaksi">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Pembayaran" aktif={tab === "masuk"} onPress={() => setTab("masuk")} />
        <Chip label="Pengeluaran" aktif={tab === "keluar"} onPress={() => setTab("keluar")} />
      </View>
      {bisa && <Btn label={tab === "masuk" ? "+ Catat pembayaran" : "+ Catat pengeluaran"} onPress={() => r.push(tab === "masuk" ? "/bayar" : "/pengeluaran-form")} />}
      <Chips>
        <Chip label="Semua kas" aktif={!kasId} onPress={() => setKasId(undefined)} />
        {(kas ?? []).map((k: any) => <Chip key={k._id} label={k.nama} aktif={kasId === k._id} onPress={() => setKasId(k._id)} />)}
      </Chips>
      {!data ? <Tunggu /> : data.length === 0 ? <Kosong teks="Belum ada catatan." /> : data.map((x: any) => (
        <Card key={x._id} onPress={() => menu(x)} s={{ opacity: x.batal ? 0.5 : 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T b>{tab === "masuk" ? x.warga?.nama : x.keterangan}</T>
            <T b c={tab === "masuk" ? C.primary : C.danger}>{tab === "masuk" ? "+" : "−"}{rp(x.jumlah)}</T>
          </View>
          <T size={13} c={C.muted}>{x.kas} · {tglIndo(x.tanggal)}{tab === "masuk" ? ` · No. ${x.warga?.noRumah}` : ""}</T>
          <T size={12} c={C.muted}>Dicatat {x.petugas}</T>
          {x.batal && <Badge tone="danger" label={`Dibatalkan: ${x.alasanBatal}`} />}
          {x.fotoUrl && !x.batal && <Image source={{ uri: x.fotoUrl }} style={{ height: 120, borderRadius: 14, marginTop: 6 }} resizeMode="cover" />}
        </Card>
      ))}
      <AlasanModal tampil={!!batal} judul="Batalkan catatan ini?" onBatal={() => setBatal(null)}
        onOk={(alasan) => { const x = batal; setBatal(null); jalankan(() => (tab === "masuk" ? batalBayar : batalKeluar)({ id: x._id, alasan })); }} />
    </Screen>
  );
}
