import { useState } from "react";
import { Alert, Share, View } from "react-native";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, Tunggu, C, jalankan } from "../src/ui";

const NAMA: any = { admin: "Admin", petugas: "Petugas kas", pengawas: "Pengawas (lihat saja)" };
export default function Pengguna() {
  const us = useQ(api.users.daftar);
  const buat = useM(api.users.buat);
  const ubah = useM(api.users.ubah);
  const reset = useM(api.users.resetPin);
  const [nama, setNama] = useState(""); const [phone, setPhone] = useState(""); const [role, setRole] = useState("petugas"); const [pin, setPin] = useState("");
  const tampilPin = (judul: string, nama: string, phone: string, pinAwal: string) => {
    const pesan = `Akun Kas RT\nNomor: ${phone}\nPIN awal: ${pinAwal}\n\nPIN ini wajib diganti saat masuk pertama kali. Jangan dibagikan ke orang lain.`;
    Alert.alert(judul, `${nama}\nPIN awal: ${pinAwal}\n\nPIN hanya ditampilkan sekarang. Berikan ke yang bersangkutan; mereka wajib menggantinya saat masuk pertama.`, [{ text: "Tutup" }, { text: "Bagikan", onPress: () => Share.share({ message: pesan }) }]);
  };

  return (
    <Screen>
      <Card>
        <T b>Buat akun baru</T>
        <T size={13} c={C.muted}>Sistem membuat PIN awal acak. Pengguna wajib menggantinya saat masuk pertama.</T>
        <Field label="Nama" value={nama} onChangeText={setNama} />
        <Field label="Nomor WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Chips>{Object.keys(NAMA).map((k) => <Chip key={k} label={NAMA[k]} aktif={role === k} onPress={() => setRole(k)} />)}</Chips>
        <Field label="PIN awal (kosongkan untuk acak)" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6} />
        <Btn label="Buat akun" disabled={!nama.trim() || phone.length < 9 || (pin.length > 0 && pin.length < 6)} onPress={async () => { const r = await jalankan(() => buat({ nama, phone, role, pin: pin || undefined })); if (r) { tampilPin("Akun dibuat", nama, phone, r.pin); setNama(""); setPhone(""); setPin(""); } }} s={{ marginTop: 8 }} />
      </Card>
      {!us ? <Tunggu /> : us.map((u: any) => (
        <Card key={u._id} s={{ opacity: u.aktif ? 1 : 0.5 }}>
          <T b>{u.nama}</T>
          <T size={13} c={C.muted}>{NAMA[u.role]} · {u.phone} · {u.wajibGanti ? "belum ganti PIN awal" : "aktif"}{u.aktif ? "" : " · dinonaktifkan"}</T>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <Btn kind="ghost" label="Reset PIN" onPress={() => Alert.alert("Reset PIN?", `${u.nama} akan keluar dari semua perangkat dan mendapat PIN awal baru yang wajib diganti.`, [{ text: "Batal" }, { text: "Reset", onPress: async () => { const r = await jalankan(() => reset({ id: u._id })); if (r) tampilPin("PIN direset", u.nama, u.phone, r.pin); } }])} s={{ flex: 1 }} />
            <Btn kind="ghost" label={u.aktif ? "Nonaktifkan" : "Aktifkan"} onPress={() => jalankan(() => ubah({ id: u._id, nama: u.nama, role: u.role, aktif: !u.aktif }))} s={{ flex: 1 }} />
          </View>
          <Chips>{Object.keys(NAMA).filter((k) => k !== u.role).map((k) => <Chip key={k} label={`→ ${NAMA[k]}`} onPress={() => jalankan(() => ubah({ id: u._id, nama: u.nama, role: k, aktif: u.aktif }))} />)}</Chips>
        </Card>
      ))}
    </Screen>
  );
}
