import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, C, Tunggu } from "../../src/ui";
import { rp, tglIndo, namaBulan } from "../../src/util";

export default function Beranda() {
  const { user } = useSesi();
  const r = useRouter();
  const d = useQ(api.laporan.dashboard);
  if (!d) return <Screen><Tunggu /></Screen>;
  const bisaCatat = user?.role === "admin" || user?.role === "petugas";
  const maks = Math.max(1, ...d.tren.map((x: any) => Math.max(x.masuk, x.keluar)));
  return (
    <Screen>
      <T c={C.muted}>Halo, {user?.nama}</T>
      <Card s={{ backgroundColor: C.primary, borderColor: C.primary }}>
        <T c="#BFDCD0" size={13}>Total saldo semua kas</T>
        <T c="#fff" b size={30}>{rp(d.totalSaldo)}</T>
        <T c="#BFDCD0" size={13}>{d.wargaAktif} warga aktif</T>
      </Card>
      {bisaCatat && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Catat bayar" onPress={() => r.push("/bayar")} s={{ flex: 1 }} />
          <Btn kind="ghost" label="Catat pengeluaran" onPress={() => r.push("/pengeluaran-form")} s={{ flex: 1 }} />
        </View>
      )}
      {d.kas.map((k: any) => (
        <Card key={k._id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T b>{k.nama}</T><T b>{rp(k.saldo)}</T>
          </View>
          <T c={C.muted} size={13}>Bulan ini: masuk {rp(k.masukBulan)} · keluar {rp(k.keluarBulan)}</T>
          {k.belumBayar != null && <T c={k.belumBayar ? C.danger : C.primary} size={13}>{k.belumBayar ? `${k.belumBayar} warga belum lunas bulan ini` : "Semua warga sudah lunas bulan ini"}</T>}
        </Card>
      ))}
      <Card>
        <T b>Masuk vs keluar, 6 bulan</T>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 8 }}>
          {d.tren.map((x: any) => (
            <View key={x.bulan} style={{ alignItems: "center", flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 96 }}>
                <View style={{ width: 11, height: Math.max(2, (x.masuk / maks) * 96), backgroundColor: C.primary, borderRadius: 3 }} />
                <View style={{ width: 11, height: Math.max(2, (x.keluar / maks) * 96), backgroundColor: C.accent, borderRadius: 3 }} />
              </View>
              <T size={11} c={C.muted}>{namaBulan(x.bulan).slice(0, 3)}</T>
            </View>
          ))}
        </View>
        <T size={12} c={C.muted}>Hijau: masuk · Kuning: keluar</T>
      </Card>
      {d.acara && (
        <Card onPress={() => r.push(`/event/${d.acara._id}`)}>
          <T c={C.muted} size={13}>Acara berikutnya</T>
          <T b>{d.acara.judul}</T>
          <T size={13}>{tglIndo(d.acara.tanggal)}{d.acara.jam ? `, ${d.acara.jam}` : ""} · {d.acara.tempat}</T>
        </Card>
      )}
    </Screen>
  );
}
