import { useState } from "react";
import { Alert } from "react-native";
import { useSesi, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, C, jalankan } from "../src/ui";

export default function Keamanan() {
  const s = useSesi();
  const ganti = useM(api.auth.gantiPin);
  const [lama, setLama] = useState(""); const [baru, setBaru] = useState("");
  return (
    <Screen>
      <Card>
        <T b>Biometrik</T>
        <T size={13} c={C.muted}>{s.bioAktif ? "Aktif di HP ini. Masuk cukup dengan sidik jari/wajah." : "Belum aktif. Masuk selalu memakai PIN."}</T>
        <Btn kind="ghost" label={s.bioAktif ? "Matikan biometrik" : "Aktifkan biometrik"} onPress={async () => {
          if (s.bioAktif) { await jalankan(s.matikanBio); return; }
          const e = await jalankan(() => s.aktifkanBio());
          if (e) Alert.alert("Biometrik", e); else if (e === null) Alert.alert("Biometrik aktif");
        }} s={{ marginTop: 8 }} />
      </Card>
      <Card>
        <T b>Ganti PIN</T>
        <Field label="PIN lama" value={lama} onChangeText={setLama} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Field label="PIN baru (6 angka)" value={baru} onChangeText={setBaru} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Btn label="Ganti PIN" disabled={lama.length < 6 || baru.length < 6} onPress={async () => { const ok = await jalankan(() => ganti({ pinLama: lama, pinBaru: baru }).then(() => true)); if (ok) { setLama(""); setBaru(""); Alert.alert("PIN diganti"); } }} s={{ marginTop: 8 }} />
      </Card>
    </Screen>
  );
}
