import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useSesi } from "../../src/session";
import { Screen, T, Card, Btn, C } from "../../src/ui";

export default function Lainnya() {
  const { user, keluar } = useSesi();
  const r = useRouter();
  const admin = user?.role === "admin";
  const peran = admin ? "Admin" : user?.role === "petugas" ? "Petugas kas" : "Pengawas (hanya lihat)";
  const item = (judul: string, ket: string, path: string) => (
    <Card key={path} onPress={() => r.push(path as any)}><T b>{judul}</T><T size={13} c={C.muted}>{ket}</T></Card>
  );
  return (
    <Screen>
      <Card><T b>{user?.nama}</T><T c={C.muted} size={13}>{peran} · {user?.phone}</T></Card>
      {item("Laporan", "Rekap bulanan, tunggakan, ekspor PDF", "/laporan")}
      {admin && item("Jenis kas", "Iuran wajib, jimpitan, bolo pecah, kas lain, petugas penanggung jawab", "/kas")}
      {admin && item("Petugas & pengguna", "Buat akun, atur peran, reset PIN", "/pengguna")}
      {(admin || user?.role === "pengawas") && item("Log aktivitas", "Siapa mengubah apa dan kapan", "/log")}
      {admin && item("Pengaturan RT & template pesan", "Nama, logo, ketua, template undangan/tagihan/kuitansi", "/pengaturan")}
      {item("Keamanan", "Biometrik dan ganti PIN", "/keamanan")}
      <Btn kind="ghost" label="Keluar" onPress={() => Alert.alert("Keluar?", undefined, [{ text: "Batal" }, { text: "Keluar", onPress: keluar }])} />
    </Screen>
  );
}
