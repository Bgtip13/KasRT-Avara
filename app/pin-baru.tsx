import { useState } from "react";
import { Alert, View } from "react-native";
import { useSesi, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { PinDots, PinPad } from "../src/pin";
import { Screen, T, Btn, C, jalankan } from "../src/ui";

// Sama dengan aturan server (convex/lib.ts pinLemah): ditolak lebih awal supaya pengguna tidak mengulang dua kali
const lemah = (p: string) => /^(\d)\1{5}$/.test(p) || "0123456789".includes(p) || "9876543210".includes(p);

// Muncul otomatis saat masuk dengan PIN awal dari admin (login pertama atau setelah reset)
export default function PinBaru() {
  const s = useSesi();
  const ganti = useM(api.auth.gantiPinAwal);
  const [tahap, setTahap] = useState<1 | 2>(1);
  const [pin1, setPin1] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const ulang = (pesan = "") => { setPin(""); setPin1(""); setTahap(1); setErr(pesan); };

  const lanjut = async (p: string) => {
    if (tahap === 1) {
      if (lemah(p)) { setPin(""); setErr("PIN terlalu mudah ditebak (mis. 123456 atau 111111). Pilih yang lain"); return; }
      setPin1(p); setPin(""); setErr(""); setTahap(2); return;
    }
    if (p !== pin1) { ulang("PIN tidak sama. Ulangi dari awal"); return; }
    setSibuk(true);
    const ok = await jalankan(() => ganti({ pinBaru: p }).then(() => true));
    setSibuk(false);
    if (!ok) { ulang(); return; }
    Alert.alert("PIN tersimpan", "Aktifkan biometrik agar masuk berikutnya cukup dengan sidik jari/wajah?", [
      { text: "Nanti saja" },
      { text: "Aktifkan", onPress: async () => { const e = await s.aktifkanBio(); if (e) Alert.alert("Biometrik", e); } },
    ]);
  };

  return (
    <Screen plain>
      <View style={{ alignItems: "center", gap: 8, marginTop: 8, paddingHorizontal: 10 }}>
        <T size={26} b s={{ letterSpacing: -0.4 }}>{tahap === 1 ? "Buat PIN baru" : "Ulangi PIN baru"}</T>
        <T c={C.muted} s={{ textAlign: "center", lineHeight: 21 }}>
          {tahap === 1 ? `Halo ${s.user?.nama ?? ""}. PIN awal dari pengurus hanya untuk masuk pertama kali. Buat PIN 6 angka yang hanya Anda yang tahu.` : "Masukkan PIN yang sama sekali lagi untuk memastikan."}
        </T>
      </View>
      <View style={{ marginVertical: 14, gap: 10 }}>
        <PinDots panjang={pin.length} error={err} />
        <T c={C.danger} size={13} s={{ textAlign: "center", minHeight: 36 }}>{err}</T>
      </View>
      <PinPad value={pin} onChange={(v) => { setPin(v); setErr(""); }} onComplete={lanjut} busy={sibuk} />
      <View style={{ marginTop: 14 }}>
        <Btn kind="ghost" label="Keluar" onPress={s.keluar} />
      </View>
    </Screen>
  );
}
