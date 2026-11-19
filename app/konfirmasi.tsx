import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { useSesi, useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Chip, SearchBar, AksiBar, Badge, Kosong, Tunggu, AlasanModal, konfirmasi, jalankan, C } from "../src/ui";
import { rp, tglIndo } from "../src/util";
import { MenuCetak, ItemCetak, itemBayar } from "../src/menu-cetak";

type Tab = "menunggu" | "disetujui" | "ditolak";

// Petugas memeriksa bukti bayar QRIS warga: setujui (otomatis tercatat + kuitansi) atau tolak
export default function Konfirmasi() {
  const { user } = useSesi();
  const [tab, setTab] = useState<Tab>("menunggu");
  const [cari, setCari] = useState("");
  const [tolakItem, setTolakItem] = useState<any>(null);
  const [lihat, setLihat] = useState<string | null>(null);
  const [cetak, setCetak] = useState<ItemCetak | null>(null);
  const d = useQ(api.pengajuan.daftar, { status: tab });
  const pg = useQ(api.pengaturan.ambil);
  const setujui = useM(api.pengajuan.setujui);
  const tolak = useM(api.pengajuan.tolak);
  const hapus = useM(api.pengajuan.hapus);
  const admin = user?.role === "admin";
  const bisa = admin || user?.role === "petugas";
  const q = cari.trim().toLowerCase();
  const data = (d as any[] | undefined)?.filter((x) => !q || [x.warga?.nama, x.warga?.noRumah, x.kas].join(" ").toLowerCase().includes(q));

  const doSetujui = (x: any) => konfirmasi("Setujui pembayaran?", `${rp(x.jumlah)} dari ${x.warga?.nama} untuk ${x.kas}. Pastikan dana sudah masuk di mutasi rekening/e-wallet.`, "Setujui", async () => {
    const res = await jalankan(() => setujui({ id: x._id }));
    if (res) setCetak(itemBayar({ noKuitansi: res.noKuitansi, warga: x.warga, kas: x.kas, jumlah: x.jumlah, tanggal: x.tanggal, metode: "QRIS", catatan: x.catatan, petugas: user?.nama ?? "", periode: [] }, pg));
  }, false);

  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Menunggu" aktif={tab === "menunggu"} onPress={() => setTab("menunggu")} />
        <Chip label="Disetujui" aktif={tab === "disetujui"} onPress={() => setTab("disetujui")} />
        <Chip label="Ditolak" aktif={tab === "ditolak"} onPress={() => setTab("ditolak")} />
      </View>
      <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama, nomor rumah, atau kas" />
      {!data ? <Tunggu /> : data.length === 0 ? <Kosong ikon="qr-code-outline" teks={tab === "menunggu" ? "Tidak ada pembayaran yang menunggu konfirmasi." : "Tidak ada data."} /> : data.map((x: any) => (
        <Card key={x._id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <T b s={{ flexShrink: 1 }}>{x.warga?.nama}</T><T b c={C.primary}>{rp(x.jumlah)}</T>
          </View>
          <T size={13} c={C.muted}>No. {x.warga?.noRumah} · {x.kas} · {tglIndo(x.tanggal)}</T>
          {!!x.catatan && <T size={13}>Catatan: {x.catatan}</T>}
          {x.buktiUrl && (
            <Pressable onPress={() => setLihat(x.buktiUrl)}>
              <Image source={{ uri: x.buktiUrl }} style={{ height: 150, borderRadius: 12, marginTop: 6, backgroundColor: C.primarySoft }} resizeMode="cover" />
              <T size={12} c={C.muted} s={{ marginTop: 3 }}>Ketuk untuk memperbesar bukti</T>
            </Pressable>
          )}
          {x.status === "disetujui" && <Badge label={`Disetujui ${x.petugas ?? ""} · ${x.noKuitansi ?? ""}`} />}
          {x.status === "ditolak" && <Badge tone="danger" label={`Ditolak: ${x.alasanTolak ?? "-"}`} />}
          {x.status === "menunggu" && bisa && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Btn kind="ghost" label="Tolak" onPress={() => setTolakItem(x)} s={{ flex: 1 }} />
              <Btn label="Setujui" onPress={() => doSetujui(x)} s={{ flex: 1 }} />
            </View>
          )}
          {x.status !== "menunggu" && <AksiBar items={[
            { label: "Cetak", icon: "print-outline", hide: x.status !== "disetujui", onPress: () => setCetak(itemBayar({ noKuitansi: x.noKuitansi, warga: x.warga, kas: x.kas, jumlah: x.jumlah, tanggal: x.tanggal, metode: "QRIS", catatan: x.catatan, petugas: x.petugas ?? "", periode: [] }, pg)) },
            { label: "Hapus arsip", icon: "trash-outline", tone: "danger", hide: !admin, onPress: () => konfirmasi("Hapus arsip ini?", "Hanya menghapus catatan konfirmasi dan bukti. Pembayaran yang sudah tercatat tidak berubah.", "Hapus", () => jalankan(() => hapus({ id: x._id }))) },
          ]} />}
        </Card>
      ))}
      <AlasanModal tampil={!!tolakItem} judul="Tolak pembayaran ini?" label="Alasan (dilihat warga)" labelOk="Tolak" onBatal={() => setTolakItem(null)}
        onOk={(alasan) => { const x = tolakItem; setTolakItem(null); jalankan(() => tolak({ id: x._id, alasan })); }} />
      <Modal visible={!!lihat} transparent animationType="fade" onRequestClose={() => setLihat(null)}>
        <Pressable onPress={() => setLihat(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" }}>
          {!!lihat && <Image source={{ uri: lihat }} style={{ width: "100%", height: "85%" }} resizeMode="contain" />}
        </Pressable>
      </Modal>
      <MenuCetak item={cetak} pg={pg} onTutup={() => setCetak(null)} />
    </Screen>
  );
}
