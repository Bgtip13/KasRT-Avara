import { useEffect, useState } from "react";
import { View, Pressable, Text, Alert, Image } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useSesi } from "../src/session";
import { Screen, T, Btn, Field, C, jalankan } from "../src/ui";

export default function Login() {
  const s = useSesi();
  const idt = useQuery(api.pengaturan.identitas, {});
  const [pin, setPin] = useState("");
  const [ph, setPh] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (s.status === "terkunci" && s.bioAktif) s.masukBio().then((e) => e && setErr(e)); }, [s.status]);

  const tekan = async (d: string) => {
    if (sibuk) return;
    const baru = (pin + d).slice(0, 6);
    setPin(baru); setErr("");
    if (baru.length === 6) {
      setSibuk(true);
      const e = await jalankan(() => s.masukPin(baru));
      if (e) { setErr(e); setPin(""); }
      setSibuk(false);
    }
  };

  if (s.status === "memuat") return <Screen><T>Memuat…</T></Screen>;

  if (s.status === "keluar")
    return (
      <Screen edges={["top", "bottom"]}>
        <View style={{ height: 40 }} />
        {!!idt?.logoUrl && <Image source={{ uri: idt.logoUrl }} style={{ width: 84, height: 84, borderRadius: 16 }} resizeMode="contain" />}
        <T size={28} b>{idt?.namaRT || "Kas RT"}</T>
        {!!idt?.tagline && <T c={C.muted}>{idt.tagline}</T>}
        <T c={C.muted}>Masukkan nomor HP yang didaftarkan pengurus. Belum punya akun atau lupa PIN? Hubungi pengurus.</T>
        <Field label="Nomor HP" value={ph} onChangeText={setPh} keyboardType="phone-pad" placeholder="0812xxxxxxxx" />
        <Btn label="Lanjut" disabled={ph.length < 9} onPress={() => s.pakaiNomor(ph)} />
      </Screen>
    );

  const tombol = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "hapus"];
  return (
    <Screen edges={["top", "bottom"]} scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 18 }}>
        <T size={24} b s={{ textAlign: "center" }}>Masukkan PIN</T>
        <T c={C.muted} s={{ textAlign: "center" }}>{s.phone}</T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.primary, backgroundColor: i < pin.length ? C.primary : "transparent" }} />
          ))}
        </View>
        <T c={C.danger} s={{ textAlign: "center", minHeight: 20 }}>{err}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
          {tombol.map((k) => {
            const kosong = k === "bio" && !s.bioAktif;
            return (
              <Pressable key={k} disabled={kosong}
                onPress={() => (k === "hapus" ? setPin(pin.slice(0, -1)) : k === "bio" ? s.masukBio().then((e) => e && setErr(e)) : tekan(k))}
                style={{ width: 76, height: 62, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: kosong ? "transparent" : C.card, borderWidth: kosong ? 0 : 1, borderColor: C.line }}>
                <Text style={{ fontSize: k.length > 1 ? 13 : 24, color: C.ink, fontWeight: "600" }}>{k === "bio" ? (kosong ? "" : "Biometrik") : k === "hapus" ? "Hapus" : k}</Text>
              </Pressable>
            );
          })}
        </View>
        <Btn kind="ghost" label="Bukan akun saya / ganti nomor" onPress={() => Alert.alert("Ganti nomor?", "Aplikasi akan melupakan nomor dan biometrik di HP ini.", [{ text: "Batal" }, { text: "Ganti", onPress: s.lupaAkun }])} />
      </View>
    </Screen>
  );
}
