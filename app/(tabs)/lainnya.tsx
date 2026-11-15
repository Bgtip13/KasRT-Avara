import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useSesi, NAMA_ROLE } from "../../src/session";
import { Screen, T, Card, Btn, Avatar, C } from "../../src/ui";

export default function Lainnya() {
  const { user, keluar } = useSesi();
  const r = useRouter();
  const role = user?.role;
  const admin = role === "admin";
  const warga = role === "warga";
  const item = (ikon: any, judul: string, ket: string, path: string) => (
    <Card key={path} onPress={() => r.push(path as any)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={ikon} size={22} color={C.primaryDark} />
        </View>
        <View style={{ flex: 1, gap: 2 }}><T b>{judul}</T><T size={13} c={C.muted}>{ket}</T></View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </View>
    </Card>
  );
  return (
    <Screen tab title={warga ? "Akun" : "Lainnya"}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar nama={user?.nama ?? ""} size={52} />
          <View style={{ flex: 1, gap: 2 }}><T b size={17}>{user?.nama}</T><T c={C.muted} size={13}>{role ? NAMA_ROLE[role] : ""} · {user?.phone}</T></View>
        </View>
      </Card>
      {!warga && item("document-text-outline", "Laporan", "Rekap bulanan, tunggakan, ekspor PDF", "/laporan")}
      {admin && item("wallet-outline", "Jenis kas", "Iuran wajib, jimpitan, bolo pecah, kas lain, petugas penanggung jawab", "/kas")}
      {admin && item("people-circle-outline", "Pengguna & peran", "Buat akun petugas, pengawas, dan warga; reset PIN", "/pengguna")}
      {(admin || role === "pengawas") && item("time-outline", "Log aktivitas", "Siapa mengubah apa dan kapan", "/log")}
      {admin && item("settings-outline", "Pengaturan RT & template pesan", "Nama, logo, ketua, template undangan/tagihan/kuitansi", "/pengaturan")}
      {item("shield-checkmark-outline", "Keamanan", "Biometrik dan ganti PIN", "/keamanan")}
      <Btn kind="ghost" label="Keluar" onPress={() => Alert.alert("Keluar?", undefined, [{ text: "Batal" }, { text: "Keluar", onPress: keluar }])} s={{ marginTop: 4 }} />
    </Screen>
  );
}
