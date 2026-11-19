import { useState } from "react";
import { Alert, Image, Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, C, jalankan } from "../src/ui";

export default function KasForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const r = useRouter();
  const kas = useQ(api.kas.daftar);
  const users = useQ(api.users.daftar);
  const simpan = useM(api.kas.simpan);
  const urlQris = useM(api.kas.buatUrlQris);
  const [f, setF] = useState<any>({ nama: "", periode: "bulanan", nominal: "", nominalKontrak: "", saldoAwal: "0", petugasIds: [], aktif: true, qrisNama: "", qrisCatatan: "" });
  const [qrisUri, setQrisUri] = useState<string | null>(null); // gambar QRIS baru (belum diunggah)
  const [sibuk, setSibuk] = useState(false);
  // Isi form sekali saja saat data kas yang diedit selesai dimuat (disesuaikan saat render, bukan lewat effect)
  const [terisiId, setTerisiId] = useState<string | null>(null);
  const kasIni = id ? kas?.find((x: any) => x._id === id) : undefined;
  if (kasIni && terisiId !== kasIni._id) {
    setTerisiId(kasIni._id);
    setF({ ...kasIni, nominal: String(kasIni.nominal), nominalKontrak: kasIni.nominalKontrak != null ? String(kasIni.nominalKontrak) : "", saldoAwal: String(kasIni.saldoAwal), qrisNama: kasIni.qrisNama ?? "", qrisCatatan: kasIni.qrisCatatan ?? "" });
  }
  const pilihQris = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) { Alert.alert("Izin ditolak", "Izinkan akses galeri di Pengaturan HP."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!res.canceled) setQrisUri(res.assets[0].uri);
  };
  const hapusQris = () => { setQrisUri(null); setF((x: any) => ({ ...x, qrisId: undefined, qrisUrl: null })); };
  const tampilQris: string | null = qrisUri ?? f.qrisUrl ?? null;
  const set = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const num = (t: string) => t.replace(/[^\d-]/g, "");
  const petugas = (users ?? []).filter((u: any) => u.aktif && (u.role === "admin" || u.role === "petugas"));
  const toggle = (uid: string) => set("petugasIds")(f.petugasIds.includes(uid) ? f.petugasIds.filter((x: string) => x !== uid) : [...f.petugasIds, uid]);

  return (
    <Screen>
      <Card s={{ gap: 12 }}>
      <Field label="Nama kas" value={f.nama} onChangeText={set("nama")} placeholder="mis. Iuran Wajib, Jimpitan, Bolo Pecah" />
      <T c={C.muted} size={13}>Jenis pembayaran</T>
      <Chips>
        <Chip label="Bulanan" aktif={f.periode === "bulanan"} onPress={() => set("periode")("bulanan")} />
        <Chip label="Sekali bayar" aktif={f.periode === "sekali"} onPress={() => set("periode")("sekali")} />
        <Chip label="Bebas / sukarela" aktif={f.periode === "bebas"} onPress={() => set("periode")("bebas")} />
      </Chips>
      {f.periode !== "bebas" && <>
        <Field label={f.periode === "bulanan" ? "Nominal per bulan (Rp)" : "Nominal (Rp)"} value={String(f.nominal)} onChangeText={(t) => set("nominal")(num(t))} keyboardType="number-pad" />
        <Field label="Nominal khusus warga kontrak (opsional)" value={String(f.nominalKontrak)} onChangeText={(t) => set("nominalKontrak")(num(t))} keyboardType="number-pad" />
      </>}
      <Field label="Saldo awal (Rp)" value={String(f.saldoAwal)} onChangeText={(t) => set("saldoAwal")(num(t))} keyboardType="numbers-and-punctuation" />
      <T c={C.muted} size={13}>Petugas penanggung jawab</T>
      <Chips>{petugas.map((u: any) => <Chip key={u._id} label={u.nama} aktif={f.petugasIds.includes(u._id)} onPress={() => toggle(u._id)} />)}</Chips>
      {petugas.length === 0 && <T size={13} c={C.muted}>Belum ada petugas. Undang dulu lewat menu Petugas & pengguna.</T>}
      <T c={C.muted} size={13}>QRIS kas ini (untuk bayar mandiri warga)</T>
      {tampilQris
        ? <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12 }}><Image source={{ uri: tampilQris }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="contain" /></View>
        : <T size={13} c={C.muted}>Belum ada QRIS. Kas ini tidak akan muncul di pembayaran mandiri warga.</T>}
      <Btn kind="soft" icon="qr-code-outline" label={tampilQris ? "Ganti gambar QRIS" : "Pilih gambar QRIS"} onPress={pilihQris} />
      {!!tampilQris && <Btn kind="ghost" label="Hapus QRIS" onPress={hapusQris} />}
      {!!tampilQris && <>
        <Field label="Nama penerima (tampil di bawah QRIS)" value={f.qrisNama ?? ""} onChangeText={set("qrisNama")} placeholder="mis. Kas RT 03 / a.n. Bendahara" />
        <Field label="Catatan untuk warga (opsional)" value={f.qrisCatatan ?? ""} onChangeText={set("qrisCatatan")} multiline />
      </>}
      {id && <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T>Kas aktif</T><Switch trackColor={{ true: C.primary, false: "#CBD5EA" }} thumbColor="#fff" value={f.aktif} onValueChange={set("aktif")} /></View>}
      </Card>
      <Btn label="Simpan" loading={sibuk} onPress={async () => {
        setSibuk(true);
        const ok = await jalankan(async () => {
          let qrisId: string | undefined = f.qrisId;
          if (qrisUri) {
            const url = await urlQris();
            const blob = await (await fetch(qrisUri)).blob();
            const up = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
            if (!up.ok) throw new Error("unggah QRIS gagal");
            qrisId = (await up.json()).storageId;
          }
          await simpan({
            id: id || undefined, nama: f.nama, periode: f.periode, nominal: Number(f.nominal || 0),
            nominalKontrak: f.nominalKontrak !== "" && f.periode !== "bebas" ? Number(f.nominalKontrak) : undefined,
            petugasIds: f.petugasIds, aktif: f.aktif, saldoAwal: Number(f.saldoAwal || 0),
            qrisId, qrisNama: qrisId ? f.qrisNama || undefined : undefined, qrisCatatan: qrisId ? f.qrisCatatan || undefined : undefined,
          });
          return true;
        });
        setSibuk(false); if (ok) r.back();
      }} />
    </Screen>
  );
}
