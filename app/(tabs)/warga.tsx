import { useState } from "react";
import { FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, SearchBar, AksiBar, Badge, Kosong, Tunggu, Avatar, useTabPad, konfirmasi, jalankan, C } from "../../src/ui";
import { cetakWarga, cetakDaftarWarga } from "../../src/cetak";

export default function Warga() {
  const { user } = useSesi();
  const r = useRouter();
  const pad = useTabPad();
  const [cari, setCari] = useState("");
  const w = useQ(api.warga.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const hapus = useM(api.warga.hapus);
  const admin = user?.role === "admin";
  const q = cari.trim().toLowerCase();
  const hasil = (w ?? []).filter((x: any) => !q || [x.nama, x.noRumah, x.blok ?? "", x.noWa].join(" ").toLowerCase().includes(q));
  return (
    <Screen tab scroll={false} title="Warga" sub={w ? `${w.filter((x: any) => x.aktif).length} warga aktif dari ${w.length}` : "Data kepala keluarga"}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {admin && <Btn icon="add" label="Tambah" onPress={() => r.push("/warga-form")} s={{ flex: 1 }} small />}
        {admin && <Btn icon="cloud-upload-outline" kind="soft" label="Impor" onPress={() => r.push("/warga-impor")} s={{ flex: 1 }} small />}
        <Btn icon="print-outline" kind="soft" label="Cetak daftar" onPress={() => jalankan(() => cetakDaftarWarga(hasil, pg ?? {}))} s={{ flex: 1 }} small disabled={!w || hasil.length === 0} />
      </View>
      <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama, nomor rumah, blok, atau WA" />
      {!w ? <Tunggu /> : (
        <FlatList data={hasil} keyExtractor={(x: any) => x._id} contentContainerStyle={{ gap: 10, paddingBottom: pad }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Kosong ikon="people-outline" teks={q ? "Tidak ada warga yang cocok dengan pencarian." : admin ? "Belum ada warga. Tambah satu, atau impor dari Excel/Google Sheet." : "Belum ada data warga."} />}
          renderItem={({ item }: any) => (
            <Card s={{ opacity: item.aktif ? 1 : 0.6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar nama={item.nama} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T b>{item.nama}</T>
                  <T size={13} c={C.muted}>No. {item.noRumah}{item.blok ? ` · Blok ${item.blok}` : ""} · {item.statusHunian}</T>
                  <T size={13} c={C.muted}>WA {item.noWa}</T>
                </View>
                {!item.aktif && <Badge tone="muted" label="Nonaktif" />}
              </View>
              <AksiBar items={[
                { label: "Edit", icon: "create-outline", hide: !admin, onPress: () => r.push({ pathname: "/warga-form", params: { id: item._id } }) },
                { label: "Cetak", icon: "print-outline", onPress: () => jalankan(() => cetakWarga(item, pg ?? {})) },
                { label: "Hapus", icon: "trash-outline", tone: "danger", hide: !admin, onPress: () => konfirmasi(`Hapus ${item.nama}?`, "Data warga, tagihan kosong, antrean undangan, dan akun loginnya ikut dihapus. Warga yang sudah punya riwayat pembayaran tidak bisa dihapus (nonaktifkan saja).", "Hapus", () => jalankan(() => hapus({ id: item._id }))) },
              ]} />
            </Card>
          )} />
      )}
    </Screen>
  );
}
