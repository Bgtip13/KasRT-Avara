import { useState } from "react";
import { Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Btn, Field, Chip, Chips, C, jalankan } from "../src/ui";
import { hariIni } from "../src/util";

export default function PengeluaranForm() {
  const r = useRouter();
  const kas = (useQ(api.kas.daftar) ?? []).filter((k: any) => k.boleh);
  const catat = useM(api.transaksi.catatKeluar);
  const buatUrl = useM(api.transaksi.buatUrlUnggah);
  const [kasId, setKasId] = useState<string>();
  const [jumlah, setJumlah] = useState(""); const [tanggal, setTanggal] = useState(hariIni()); const [ket, setKet] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const ambilFoto = async (kamera: boolean) => {
    const izin = kamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) { Alert.alert("Izin ditolak", "Izinkan akses di Pengaturan HP."); return; }
    const res = await (kamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ quality: 0.5, mediaTypes: ["images"] });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const simpan = async () => {
    setSibuk(true);
    const ok = await jalankan(async () => {
      let fotoId: string | undefined;
      if (foto) {
        const url = await buatUrl();
        const blob = await (await fetch(foto)).blob();
        const up = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
        fotoId = (await up.json()).storageId;
      }
      await catat({ kasId, jumlah: Number(jumlah), tanggal, keterangan: ket, fotoId });
      return true;
    });
    setSibuk(false);
    if (ok) r.back();
  };

  return (
    <Screen>
      <T c={C.muted} size={13}>Diambil dari kas</T>
      <Chips>{kas.map((x: any) => <Chip key={x._id} label={`${x.nama} (${x.saldo.toLocaleString("id-ID")})`} aktif={kasId === x._id} onPress={() => setKasId(x._id)} />)}</Chips>
      <Field label="Jumlah (Rp)" value={jumlah} onChangeText={(t) => setJumlah(t.replace(/\D/g, ""))} keyboardType="number-pad" />
      <Field label="Tanggal (YYYY-MM-DD)" value={tanggal} onChangeText={setTanggal} />
      <Field label="Keterangan" value={ket} onChangeText={setKet} placeholder="mis. Beli lampu pos ronda" />
      {foto && <Image source={{ uri: foto }} style={{ height: 160, borderRadius: 10 }} />}
      <Chips><Chip label="Foto nota (kamera)" onPress={() => ambilFoto(true)} /><Chip label="Pilih dari galeri" onPress={() => ambilFoto(false)} /></Chips>
      <Btn label="Simpan pengeluaran" loading={sibuk} disabled={!kasId || !Number(jumlah) || !ket.trim()} onPress={simpan} />
    </Screen>
  );
}
