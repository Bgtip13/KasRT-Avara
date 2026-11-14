import { useState } from "react";
import { Alert } from "react-native";
import { useSesi, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Btn, Field, C, jalankan } from "../src/ui";

// Muncul otomatis saat masuk dengan PIN awal dari admin (login pertama atau setelah reset)
export default function PinBaru() {
  const s = useSesi();
  const ganti = useM(api.auth.gantiPinAwal);
  const [pin, setPin] = useState(""); const [pin2, setPin2] = useState(""); const [sibuk, setSibuk] = useState(false);
  return (
    <Screen edges={["top", "bottom"]}>
      <T size={24} b s={{ marginTop: 24 }}>Buat PIN baru</T>
      <T c={C.muted}>Halo {s.user?.nama}. PIN awal dari pengurus hanya untuk masuk pertama kali. Buat PIN 6 angka yang hanya Anda yang tahu.</T>
      <Field label="PIN baru (6 angka)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />
      <Field label="Ulangi PIN baru" value={pin2} onChangeText={setPin2} keyboardType="number-pad" secureTextEntry maxLength={6} />
      {pin2.length === 6 && pin !== pin2 && <T c={C.danger}>PIN tidak sama</T>}
      <Btn label="Simpan PIN" loading={sibuk} disabled={pin.length < 6 || pin !== pin2} onPress={async () => {
        setSibuk(true);
        const ok = await jalankan(() => ganti({ pinBaru: pin }).then(() => true));
        setSibuk(false);
        if (ok) Alert.alert("PIN tersimpan", "Aktifkan biometrik agar masuk berikutnya cukup dengan sidik jari/wajah?", [
          { text: "Nanti saja" },
          { text: "Aktifkan", onPress: async () => { const e = await s.aktifkanBio(); if (e) Alert.alert("Biometrik", e); } },
        ]);
      }} />
      <Btn kind="ghost" label="Keluar" onPress={s.keluar} />
    </Screen>
  );
}
