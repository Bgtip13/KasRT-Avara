import { useState } from "react";
import { FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Kosong, Tunggu, Avatar, useTabPad, C } from "../../src/ui";

export default function Warga() {
  const { user } = useSesi();
  const r = useRouter();
  const pad = useTabPad();
  const [cari, setCari] = useState("");
  const w = useQ(api.warga.daftar);
  const admin = user?.role === "admin";
  const hasil = (w ?? []).filter((x: any) => (x.nama + " " + x.noRumah).toLowerCase().includes(cari.toLowerCase()));
  return (
    <Screen tab scroll={false} title="Warga" sub="Data kepala keluarga">
      <Field label="Cari nama / nomor rumah" value={cari} onChangeText={setCari} />
      {admin && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="+ Tambah" onPress={() => r.push("/warga-form")} s={{ flex: 1 }} />
          <Btn kind="ghost" label="Impor Excel / Sheet" onPress={() => r.push("/warga-impor")} s={{ flex: 1 }} />
        </View>
      )}
      {!w ? <Tunggu /> : (
        <FlatList data={hasil} keyExtractor={(x: any) => x._id} contentContainerStyle={{ gap: 10, paddingBottom: pad }} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Kosong teks={admin ? "Belum ada warga. Tambah satu, atau impor dari Excel/Google Sheet." : "Belum ada data warga."} />}
          renderItem={({ item }: any) => (
            <Card onPress={admin ? () => r.push({ pathname: "/warga-form", params: { id: item._id } }) : undefined} s={{ opacity: item.aktif ? 1 : 0.5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar nama={item.nama} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T b>{item.nama}</T>
                  <T size={13} c={C.muted}>No. {item.noRumah}{item.blok ? ` · Blok ${item.blok}` : ""} · {item.statusHunian}{item.aktif ? "" : " · nonaktif"}</T>
                  <T size={13} c={C.muted}>WA {item.noWa}</T>
                </View>
              </View>
            </Card>
          )} />
      )}
    </Screen>
  );
}
