import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Btn, Field, Chip, Chips, C, jalankan } from "../src/ui";

export default function KasForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const r = useRouter();
  const kas = useQ(api.kas.daftar);
  const users = useQ(api.users.daftar);
  const simpan = useM(api.kas.simpan);
  const [f, setF] = useState<any>({ nama: "", periode: "bulanan", nominal: "", nominalKontrak: "", saldoAwal: "0", petugasIds: [], aktif: true });
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => {
    const k = id && kas?.find((x: any) => x._id === id);
    if (k) setF({ ...k, nominal: String(k.nominal), nominalKontrak: k.nominalKontrak != null ? String(k.nominalKontrak) : "", saldoAwal: String(k.saldoAwal) });
  }, [id, kas]);
  const set = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const num = (t: string) => t.replace(/[^\d-]/g, "");
  const petugas = (users ?? []).filter((u: any) => u.aktif && (u.role === "admin" || u.role === "petugas"));
  const toggle = (uid: string) => set("petugasIds")(f.petugasIds.includes(uid) ? f.petugasIds.filter((x: string) => x !== uid) : [...f.petugasIds, uid]);

  return (
    <Screen>
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
      {id && <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T>Kas aktif</T><Switch trackColor={{ true: C.primary, false: "#CBD5EA" }} thumbColor="#fff" value={f.aktif} onValueChange={set("aktif")} /></View>}
      <Btn label="Simpan" loading={sibuk} onPress={async () => {
        setSibuk(true);
        const ok = await jalankan(() => simpan({ id: id || undefined, nama: f.nama, periode: f.periode, nominal: Number(f.nominal || 0), nominalKontrak: f.nominalKontrak !== "" && f.periode !== "bebas" ? Number(f.nominalKontrak) : undefined, petugasIds: f.petugasIds, aktif: f.aktif, saldoAwal: Number(f.saldoAwal || 0) }).then(() => true));
        setSibuk(false); if (ok) r.back();
      }} />
    </Screen>
  );
}
