import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Tunggu, C, jalankan } from "../../src/ui";
import { tglIndo, hariIni, rp } from "../../src/util";
import { cetakUndangan } from "../../src/cetak";

export default function DetailEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSesi();
  const r = useRouter();
  const d = useQ(api.event.detail, { eventId: id });
  const pg = useQ(api.pengaturan.ambil);
  const proses = useM(api.event.prosesTagihan);
  if (!d || !pg) return <Screen><Tunggu /></Screen>;
  const { event: e, undangan, tagihan } = d;
  const admin = user?.role === "admin";
  const terkirim = undangan.filter((x: any) => x.status === "terkirim").length;
  const lewat = e.tanggal < hariIni();
  const tTerkirim = tagihan.filter((x: any) => x.status === "terkirim").length;
  return (
    <Screen>
      <Card>
        <T b size={18}>{e.judul}</T>
        <T>{tglIndo(e.tanggal)}{e.jam ? `, ${e.jam}` : ""}</T>
        <T c={C.muted}>{e.tempat}</T>
        {e.deskripsi ? <T size={13} c={C.muted}>{e.deskripsi}</T> : null}
        {admin && <Btn kind="ghost" label="Ubah acara" onPress={() => r.push({ pathname: "/event-form", params: { id } })} s={{ marginTop: 8 }} />}
      </Card>
      <Card>
        <T b>Undangan</T>
        <T c={C.muted} size={13}>Terkirim {terkirim} dari {undangan.length} warga</T>
        {admin && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Btn label="Kirim lewat WhatsApp (pilih banyak, atur jeda)" onPress={() => r.push({ pathname: "/blast", params: { eventId: id, jenis: "undangan" } })} />
            <Btn kind="ghost" label="Cetak undangan (PDF, 1 halaman per warga)" onPress={() => jalankan(() => cetakUndangan(undangan.map((x: any) => x.warga), e, pg))} />
          </View>
        )}
      </Card>
      <Card>
        <T b>Tagihan H+1</T>
        {!lewat && <T c={C.muted} size={13}>Diproses otomatis sehari setelah acara ({tglIndo(e.tanggal)}). Warga yang belum lunas akan masuk antrean pengingat.</T>}
        {lewat && !e.diproses && <T c={C.muted} size={13}>Menunggu proses otomatis (01.00 WIB). Admin bisa memprosesnya sekarang.</T>}
        {e.diproses && <T c={C.muted} size={13}>{tagihan.length} warga belum lunas · pengingat terkirim {tTerkirim}</T>}
        {admin && lewat && !e.diproses && <Btn label="Proses tagihan sekarang" onPress={() => Alert.alert("Proses tagihan?", "Sistem membuat tagihan bulan acara dan antrean pengingat untuk warga yang belum lunas.", [{ text: "Batal" }, { text: "Proses", onPress: () => jalankan(() => proses({ eventId: id })) }])} s={{ marginTop: 8 }} />}
        {admin && e.diproses && tagihan.length > 0 && <Btn label="Kirim pengingat lewat WhatsApp" onPress={() => r.push({ pathname: "/blast", params: { eventId: id, jenis: "tagihan" } })} s={{ marginTop: 8 }} />}
        {e.diproses && tagihan.slice(0, 10).map((x: any) => <T key={x._id} size={13}>{x.status === "terkirim" ? "✓ " : "• "}{x.warga.nama} ({x.warga.noRumah}) — {rp(x.total ?? 0)}</T>)}
      </Card>
    </Screen>
  );
}
