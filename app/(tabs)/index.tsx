import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSesi, useQ } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Hero, Judul, C, Tunggu } from "../../src/ui";
import { rp, tglIndo, namaBulan } from "../../src/util";
import { BerandaWarga } from "../../src/warga-views";

export default function Beranda() {
  const { user } = useSesi();
  return user?.role === "warga" ? <BerandaWarga /> : <BerandaStaf />;
}

function BerandaStaf() {
  const { user } = useSesi();
  const r = useRouter();
  const d = useQ(api.laporan.dashboard);
  const judul = `Halo, ${(user?.nama ?? "").split(" ")[0]}`;
  if (!d) return <Screen tab title={judul}><Tunggu /></Screen>;
  const bisaCatat = user?.role === "admin" || user?.role === "petugas";
  const maks = Math.max(1, ...d.tren.map((x: any) => Math.max(x.masuk, x.keluar)));
  return (
    <Screen tab title={judul} sub="Ringkasan kas RT">
      <Hero>
        <T c="rgba(255,255,255,0.78)" size={13}>Total saldo semua kas</T>
        <T c="#fff" b size={36} s={{ letterSpacing: -0.5 }}>{rp(d.totalSaldo)}</T>
        <T c="rgba(255,255,255,0.78)" size={13}>{d.wargaAktif} warga aktif</T>
      </Hero>
      {bisaCatat && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Btn label="Catat bayar" onPress={() => r.push("/bayar")} s={{ flex: 1 }} />
          <Btn kind="ghost" label="Catat pengeluaran" onPress={() => r.push("/pengeluaran-form")} s={{ flex: 1 }} />
        </View>
      )}
      {d.kas.length > 0 && <Judul>Per jenis kas</Judul>}
      {d.kas.map((k: any) => (
        <Card key={k._id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T b>{k.nama}</T><T b>{rp(k.saldo)}</T>
          </View>
          <T c={C.muted} size={13}>Bulan ini: masuk {rp(k.masukBulan)} · keluar {rp(k.keluarBulan)}</T>
          {k.belumBayar != null && <T c={k.belumBayar ? C.danger : C.primary} size={13}>{k.belumBayar ? `${k.belumBayar} warga belum lunas bulan ini` : "Semua warga sudah lunas bulan ini"}</T>}
        </Card>
      ))}
      <Judul>Tren 6 bulan</Judul>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, marginTop: 4 }}>
          {d.tren.map((x: any) => (
            <View key={x.bulan} style={{ alignItems: "center", flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 96 }}>
                <View style={{ width: 12, height: Math.max(3, (x.masuk / maks) * 96), backgroundColor: C.primary, borderRadius: 6 }} />
                <View style={{ width: 12, height: Math.max(3, (x.keluar / maks) * 96), backgroundColor: C.violet, borderRadius: 6 }} />
              </View>
              <T size={11} c={C.muted}>{namaBulan(x.bulan).slice(0, 3)}</T>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /><T size={12} c={C.muted}>Masuk</T></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /><T size={12} c={C.muted}>Keluar</T></View>
        </View>
      </Card>
      {d.acara && (
        <Card onPress={() => r.push(`/event/${d.acara._id}`)}>
          <T c={C.muted} size={13}>Acara berikutnya</T>
          <T b size={16}>{d.acara.judul}</T>
          <T size={13}>{tglIndo(d.acara.tanggal)}{d.acara.jam ? `, ${d.acara.jam}` : ""} · {d.acara.tempat}</T>
        </Card>
      )}
    </Screen>
  );
}
