import { useEffect, useState } from "react";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Btn, Field, Tunggu, C, jalankan } from "../src/ui";
import { TPL_UNDANGAN, TPL_TAGIHAN, TPL_KUITANSI } from "../src/util";
import { Alert, Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function Pengaturan() {
  const pg = useQ(api.pengaturan.ambil);
  const simpan = useM(api.pengaturan.simpan);
  const urlUnggah = useM(api.pengaturan.urlUnggahLogo);
  const setLogo = useM(api.pengaturan.setLogo);
  const [sibukLogo, setSibukLogo] = useState(false);
  const pilihLogo = async () => {
    const h = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (h.canceled) return;
    setSibukLogo(true);
    await jalankan(async () => {
      const url = await urlUnggah();
      const blob = await (await fetch(h.assets[0].uri)).blob();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
      if (!res.ok) throw new Error("unggah gagal");
      const { storageId } = await res.json();
      await setLogo({ storageId });
    });
    setSibukLogo(false);
  };
  const [f, setF] = useState<Record<string, string>>({});
  useEffect(() => { if (pg) setF({ namaRT: "", alamatRT: "", ketua: "", sebutanKetua: "", bendahara: "", tagline: "", tpl_undangan: TPL_UNDANGAN, tpl_tagihan: TPL_TAGIHAN, tpl_kuitansi: TPL_KUITANSI, ...pg }); }, [pg]);
  if (!pg) return <Screen><Tunggu /></Screen>;
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Screen>
      <T b>Logo</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {pg.logoUrl ? <Image source={{ uri: pg.logoUrl }} style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: C.card }} resizeMode="contain" /> : <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: C.primarySoft }} />}
        <View style={{ flex: 1, gap: 6 }}>
          <Btn kind="ghost" label={pg.logoUrl ? "Ganti logo" : "Pilih logo"} loading={sibukLogo} onPress={pilihLogo} />
          {!!pg.logoUrl && <Btn kind="ghost" label="Hapus logo" disabled={sibukLogo} onPress={() => jalankan(() => setLogo({}))} />}
        </View>
      </View>
      <Field label="Nama RT / kumpulan" value={f.namaRT ?? ""} onChangeText={set("namaRT")} placeholder="mis. RT 03 RW 05 Kelurahan …" />
      <Field label="Slogan / keterangan singkat (tampil di layar masuk)" value={f.tagline ?? ""} onChangeText={set("tagline")} />
      <Field label="Alamat (untuk kop surat)" value={f.alamatRT ?? ""} onChangeText={set("alamatRT")} />
      <Field label="Sebutan ketua (mis. Ketua RT, Ketua Paguyuban)" value={f.sebutanKetua ?? ""} onChangeText={set("sebutanKetua")} placeholder="Ketua RT" />
      <Field label="Nama ketua" value={f.ketua ?? ""} onChangeText={set("ketua")} />
      <Field label="Nama Bendahara" value={f.bendahara ?? ""} onChangeText={set("bendahara")} />
      <T b>Template undangan</T>
      <T size={12} c={C.muted}>Variabel: {"{nama} {no_rumah} {judul} {tanggal} {jam} {tempat} {rt}"}</T>
      <Field label="" value={f.tpl_undangan ?? ""} onChangeText={set("tpl_undangan")} multiline />
      <T b>Template pengingat tagihan</T>
      <T size={12} c={C.muted}>Variabel: {"{nama} {no_rumah} {rincian} {total} {rt}"}</T>
      <Field label="" value={f.tpl_tagihan ?? ""} onChangeText={set("tpl_tagihan")} multiline />
      <T b>Template kuitansi WA</T>
      <T size={12} c={C.muted}>Variabel: {"{no_kuitansi} {nama} {no_rumah} {kas} {jumlah} {tanggal} {petugas} {rt}"}</T>
      <Field label="" value={f.tpl_kuitansi ?? ""} onChangeText={set("tpl_kuitansi")} multiline />
      <Btn label="Simpan pengaturan" onPress={async () => { const ok = await jalankan(() => simpan({ data: Object.fromEntries(Object.entries(f).filter(([k]) => k !== "logoUrl" && k !== "logoId")) }).then(() => true)); if (ok) Alert.alert("Tersimpan"); }} />
    </Screen>
  );
}
