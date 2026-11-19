import { useState } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Chip, Chips, SearchBar, AksiBar, Sheet, Kosong, Tunggu, AlasanModal, Badge, konfirmasi, C, jalankan } from "../../src/ui";
import { rp, tglIndo } from "../../src/util";
import { RiwayatWarga } from "../../src/warga-views";
import { MenuCetak, ItemCetak, itemBayar, itemKeluar } from "../../src/menu-cetak";

export default function Transaksi() {
  const { user } = useSesi();
  return user?.role === "warga" ? <RiwayatWarga /> : <TransaksiStaf />;
}

function TransaksiStaf() {
  const { user } = useSesi();
  const r = useRouter();
  const [tab, setTab] = useState<"masuk" | "keluar">("masuk");
  const [kasId, setKasId] = useState<string | undefined>();
  const [cari, setCari] = useState("");
  const [batal, setBatal] = useState<any>(null);
  const [hapusPilih, setHapusPilih] = useState<any>(null);
  const [cetak, setCetak] = useState<ItemCetak | null>(null);
  const kas = useQ(api.kas.daftar);
  const pm = useQ(api.transaksi.daftarBayar, { kasId });
  const pk = useQ(api.transaksi.daftarKeluar, { kasId });
  const pg = useQ(api.pengaturan.ambil);
  const batalBayar = useM(api.transaksi.batalBayar);
  const batalKeluar = useM(api.transaksi.batalKeluar);
  const hapusBayar = useM(api.transaksi.hapusBayar);
  const hapusKeluar = useM(api.transaksi.hapusKeluar);
  const admin = user?.role === "admin";
  const bisa = admin || user?.role === "petugas";
  const q = cari.trim().toLowerCase();
  const data = ((tab === "masuk" ? pm : pk) as any[] | undefined)?.filter((x) => !q || (tab === "masuk"
    ? [x.warga?.nama, x.warga?.noRumah, x.noKuitansi, x.kas, x.metode ?? ""]
    : [x.keterangan, x.kas, x.petugas]).join(" ").toLowerCase().includes(q));

  const hapusPermanen = (x: any) => konfirmasi("Hapus permanen?", "Catatan dihapus dari database dan tidak bisa dikembalikan. Saldo dan tagihan dihitung ulang. Untuk koreksi yang tetap meninggalkan jejak, pilih “Batalkan”.", "Hapus", () => jalankan(() => (tab === "masuk" ? hapusBayar : hapusKeluar)({ id: x._id })));

  return (
    <Screen tab title="Transaksi">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Pembayaran" aktif={tab === "masuk"} onPress={() => setTab("masuk")} />
        <Chip label="Pengeluaran" aktif={tab === "keluar"} onPress={() => setTab("keluar")} />
      </View>
      {bisa && <Btn icon="add" label={tab === "masuk" ? "Catat pembayaran" : "Catat pengeluaran"} onPress={() => r.push(tab === "masuk" ? "/bayar" : "/pengeluaran-form")} />}
      <SearchBar value={cari} onChangeText={setCari} placeholder={tab === "masuk" ? "Cari nama, no. rumah, atau no. kuitansi" : "Cari keterangan atau kas"} />
      <Chips>
        <Chip label="Semua kas" aktif={!kasId} onPress={() => setKasId(undefined)} />
        {(kas ?? []).map((k: any) => <Chip key={k._id} label={k.nama} aktif={kasId === k._id} onPress={() => setKasId(k._id)} />)}
      </Chips>
      {!data ? <Tunggu /> : data.length === 0 ? <Kosong ikon="receipt-outline" teks={q ? "Tidak ada catatan yang cocok." : "Belum ada catatan."} /> : data.map((x: any) => (
        <Card key={x._id}>
          <View style={{ opacity: x.batal ? 0.5 : 1, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <T b s={{ flexShrink: 1 }}>{tab === "masuk" ? x.warga?.nama : x.keterangan}</T>
              <T b c={tab === "masuk" ? C.primary : C.danger}>{tab === "masuk" ? "+" : "−"}{rp(x.jumlah)}</T>
            </View>
            <T size={13} c={C.muted}>{x.kas} · {tglIndo(x.tanggal)}{tab === "masuk" ? ` · No. ${x.warga?.noRumah}` : ""}{tab === "masuk" && x.metode ? ` · ${x.metode}` : ""}</T>
            <T size={12} c={C.muted}>{tab === "masuk" ? `${x.noKuitansi} · ` : ""}Dicatat {x.petugas}</T>
            {x.fotoUrl && !x.batal && <Image source={{ uri: x.fotoUrl }} style={{ height: 120, borderRadius: 14, marginTop: 6 }} resizeMode="cover" />}
          </View>
          {x.batal && <Badge tone="danger" label={`Dibatalkan: ${x.alasanBatal}`} />}
          <AksiBar items={[
            { label: "Edit", icon: "create-outline", hide: !bisa || x.batal, onPress: () => r.push({ pathname: tab === "masuk" ? "/bayar" : "/pengeluaran-form", params: { id: x._id } }) },
            { label: "Cetak", icon: "print-outline", hide: x.batal, onPress: () => setCetak(tab === "masuk" ? itemBayar(x, pg) : itemKeluar(x, pg)) },
            { label: "Hapus", icon: "trash-outline", tone: "danger", hide: !bisa || (x.batal && !admin), onPress: () => setHapusPilih(x) },
          ]} />
        </Card>
      ))}
      <Sheet tampil={!!hapusPilih} judul="Hapus catatan ini?" sub={hapusPilih ? (tab === "masuk" ? hapusPilih.noKuitansi : hapusPilih.keterangan) : undefined} onTutup={() => setHapusPilih(null)}
        items={hapusPilih ? [
          ...(!hapusPilih.batal ? [{ label: "Batalkan (arsip)", ket: "Tetap tercatat di riwayat dengan alasan, tidak dihitung di saldo", icon: "close-circle-outline" as const, onPress: () => setBatal(hapusPilih) }] : []),
          ...(admin ? [{ label: "Hapus permanen", ket: "Dihapus dari database, tidak bisa dikembalikan", icon: "trash-outline" as const, tone: "danger" as const, onPress: () => hapusPermanen(hapusPilih) }] : []),
        ] : []} />
      <AlasanModal tampil={!!batal} judul="Batalkan catatan ini?" onBatal={() => setBatal(null)}
        onOk={(alasan) => { const x = batal; setBatal(null); jalankan(() => (tab === "masuk" ? batalBayar : batalKeluar)({ id: x._id, alasan })); }} />
      <MenuCetak item={cetak} pg={pg} onTutup={() => setCetak(null)} />
    </Screen>
  );
}
