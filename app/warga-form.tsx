import { useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, C, jalankan } from "../src/ui";

export default function WargaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const r = useRouter();
  const semua = useQ(api.warga.daftar);
  const simpan = useM(api.warga.simpan);
  const [f, setF] = useState<any>({ nama: "", noRumah: "", noWa: "", statusHunian: "tetap", blok: "", catatan: "", aktif: true });
  const [sibuk, setSibuk] = useState(false);
  // Isi form sekali saat data warga yang diedit selesai dimuat (disesuaikan saat render, bukan lewat effect)
  const [terisiId, setTerisiId] = useState<string | null>(null);
  const wargaIni = id ? semua?.find((x: any) => x._id === id) : undefined;
  if (wargaIni && terisiId !== wargaIni._id) {
    setTerisiId(wargaIni._id);
    setF({ ...wargaIni, blok: wargaIni.blok ?? "", catatan: wargaIni.catatan ?? "" });
  }
  const set = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  return (
    <Screen>
      <Card s={{ gap: 12 }}>
      <Field label="Nama kepala keluarga" value={f.nama} onChangeText={set("nama")} />
      <Field label="Nomor rumah" value={f.noRumah} onChangeText={set("noRumah")} />
      <Field label="Nomor WhatsApp" value={f.noWa} onChangeText={set("noWa")} keyboardType="phone-pad" placeholder="0812xxxxxxxx" />
      <Field label="Blok (opsional)" value={f.blok} onChangeText={set("blok")} />
      <T c={C.muted} size={13}>Status hunian</T>
      <Chips><Chip label="Tetap" aktif={f.statusHunian === "tetap"} onPress={() => set("statusHunian")("tetap")} /><Chip label="Kontrak" aktif={f.statusHunian === "kontrak"} onPress={() => set("statusHunian")("kontrak")} /></Chips>
      <Field label="Catatan (opsional)" value={f.catatan} onChangeText={set("catatan")} />
      {id && <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T>Warga aktif</T><Switch trackColor={{ true: C.primary, false: "#CBD5EA" }} thumbColor="#fff" value={f.aktif} onValueChange={set("aktif")} /></View>}
      </Card>
      <Btn label="Simpan" loading={sibuk} onPress={async () => {
        setSibuk(true);
        const ok = await jalankan(() => simpan({ id: id || undefined, nama: f.nama, noRumah: f.noRumah, noWa: f.noWa, statusHunian: f.statusHunian, blok: f.blok || undefined, catatan: f.catatan || undefined, aktif: f.aktif }).then(() => true));
        setSibuk(false); if (ok) r.back();
      }} />
    </Screen>
  );
}
