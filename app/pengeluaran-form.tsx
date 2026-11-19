import { useState } from "react";
import { Alert, Image, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, Tunggu, jalankan } from "../src/ui";
import { hariIni, rp } from "../src/util";

export default function PengeluaranForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const edit = !!id;
  const r = useRouter();
  const kas = (useQ(api.kas.daftar) ?? []).filter((k: any) => k.boleh);
  const lama = useQ(api.transaksi.ambilKeluar, id ? { id } : "skip");
  const catat = useM(api.transaksi.catatKeluar);
  const ubah = useM(api.transaksi.ubahKeluar);
  const buatUrl = useM(api.transaksi.buatUrlUnggah);
  const [kasId, setKasId] = useState<string>();
  const [jumlah, setJumlah] = useState(""); const [tanggal, setTanggal] = useState(hariIni()); const [ket, setKet] = useState("");
  const [foto, setFoto] = useState<string | null>(null);        // foto baru (belum diunggah)
  const [fotoLama, setFotoLama] = useState<string | null>(null); // foto tersimpan
  const [sibuk, setSibuk] = useState(false);

  // Isi form sekali saat data lama selesai dimuat (disesuaikan saat render, bukan lewat effect)
  const [terisiId, setTerisiId] = useState<string | null>(null);
  if (lama && terisiId !== lama._id) {
    setTerisiId(lama._id);
    setKasId(lama.kasId); setJumlah(String(lama.jumlah)); setTanggal(lama.tanggal); setKet(lama.keterangan); setFotoLama(lama.fotoUrl ?? null);
  }

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
      if (edit) await ubah({ id, kasId, jumlah: Number(jumlah), tanggal, keterangan: ket, fotoId, hapusFoto: !foto && !fotoLama && !!lama?.fotoId ? true : undefined });
      else await catat({ kasId, jumlah: Number(jumlah), tanggal, keterangan: ket, fotoId });
      return true;
    });
    setSibuk(false);
    if (ok) r.back();
  };

  if (edit && lama === undefined) return <Screen><Tunggu /></Screen>;
  const tampilFoto = foto ?? fotoLama;
  return (
    <Screen>
      <Card s={{ gap: 10 }}>
        <T b>Diambil dari kas</T>
        <Chips>{kas.map((x: any) => <Chip key={x._id} label={`${x.nama} (${rp(x.saldo)})`} aktif={kasId === x._id} onPress={() => setKasId(x._id)} />)}</Chips>
      </Card>
      <Card s={{ gap: 12 }}>
        <Field label="Jumlah (Rp)" value={jumlah} onChangeText={(t) => setJumlah(t.replace(/\D/g, ""))} keyboardType="number-pad" />
        <Field label="Tanggal (YYYY-MM-DD)" value={tanggal} onChangeText={setTanggal} />
        <Field label="Keterangan" value={ket} onChangeText={setKet} placeholder="mis. Beli lampu pos ronda" />
      </Card>
      <Card s={{ gap: 10 }}>
        <T b>Foto nota (opsional)</T>
        {!!tampilFoto && <Image source={{ uri: tampilFoto }} style={{ height: 180, borderRadius: 12 }} resizeMode="cover" />}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn small icon="camera-outline" kind="soft" label="Kamera" onPress={() => ambilFoto(true)} s={{ flex: 1 }} />
          <Btn small icon="images-outline" kind="soft" label="Galeri" onPress={() => ambilFoto(false)} s={{ flex: 1 }} />
          {!!tampilFoto && <Btn small icon="trash-outline" kind="ghost" label="Buang" onPress={() => { setFoto(null); setFotoLama(null); }} s={{ flex: 1 }} />}
        </View>
      </Card>
      <Btn label={edit ? "Simpan perubahan" : "Simpan pengeluaran"} loading={sibuk} disabled={!kasId || !Number(jumlah) || !ket.trim()} onPress={simpan} />
    </Screen>
  );
}
