import { useEffect, useState } from "react";
import { View, Pressable, Text, Alert, Image } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useSesi } from "../src/session";
import { PinDots, PinPad } from "../src/pin";
import { Screen, T, Btn, Field, Card, Tunggu, C, jalankan } from "../src/ui";

export default function Login() {
  const s = useSesi();
  const idt = useQuery(api.pengaturan.identitas, {});
  const [pin, setPin] = useState("");
  const [ph, setPh] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (s.status === "terkunci" && s.bioAktif) s.masukBio().then((e) => e && setErr(e)); }, [s.status]);

  const selesai = async (p: string) => {
    setSibuk(true);
    const e = await jalankan(() => s.masukPin(p)); // null = berhasil, string = pesan salah, undefined = gagal jaringan
    if (e !== null) { setPin(""); if (e) setErr(e); }
    setSibuk(false);
  };

  const logo = (ukuran: number) => (
    <Image source={idt?.logoUrl ? { uri: idt.logoUrl } : require("../assets/images/logo-mark.png")}
      style={{ width: ukuran, height: ukuran, borderRadius: ukuran * 0.26 }} resizeMode="contain" />
  );

  if (s.status === "memuat") return <Screen plain><Tunggu /></Screen>;

  if (s.status === "keluar")
    return (
      <Screen plain>
        <View style={{ alignItems: "center", gap: 6, marginTop: 36, marginBottom: 16 }}>
          {logo(92)}
          <T size={28} b s={{ marginTop: 10, letterSpacing: -0.5 }}>{idt?.namaRT || "Kas RT"}</T>
          {!!idt?.tagline && <T c={C.muted}>{idt.tagline}</T>}
        </View>
        <Card s={{ gap: 14, padding: 20 }}>
          <T c={C.muted} s={{ lineHeight: 21 }}>Masukkan nomor HP yang didaftarkan pengurus. Belum punya akun atau lupa PIN? Hubungi pengurus.</T>
          <Field label="Nomor HP" value={ph} onChangeText={setPh} keyboardType="phone-pad" placeholder="0812xxxxxxxx" />
          <Btn label="Lanjut" disabled={ph.length < 9} onPress={() => s.pakaiNomor(ph)} />
        </Card>
      </Screen>
    );

  return (
    <Screen plain>
      <View style={{ alignItems: "center", gap: 6, marginTop: 8 }}>
        {logo(64)}
        <T size={24} b s={{ marginTop: 10, letterSpacing: -0.4 }}>Masukkan PIN</T>
        <T c={C.muted}>{s.phone}</T>
      </View>
      <View style={{ marginVertical: 14, gap: 10 }}>
        <PinDots panjang={pin.length} error={err} />
        <T c={C.danger} size={13} s={{ textAlign: "center", minHeight: 18 }}>{err}</T>
      </View>
      <PinPad value={pin} onChange={(v) => { setPin(v); setErr(""); }} onComplete={selesai} busy={sibuk}
        bio={s.bioAktif} onBio={() => s.masukBio().then((e) => e && setErr(e))} />
      <Pressable onPress={() => Alert.alert("Ganti nomor?", "Aplikasi akan melupakan nomor dan biometrik di HP ini.", [{ text: "Batal" }, { text: "Ganti", onPress: s.lupaAkun }])}
        style={{ alignSelf: "center", paddingVertical: 14, paddingHorizontal: 12, marginTop: 8 }}>
        <Text style={{ color: C.primaryDark, fontWeight: "600" }}>Bukan akun saya / ganti nomor</Text>
      </Pressable>
    </Screen>
  );
}
