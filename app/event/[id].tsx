import { useEffect } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, AksiBar, Kosong, Tunggu, konfirmasi, C, jalankan } from "../../src/ui";
import { tglIndo, hariIni, rp } from "../../src/util";
import { cetakUndangan, cetakAcara } from "../../src/cetak";

export default function DetailEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSesi();
  const r = useRouter();
  const d = useQ(api.event.detail, { eventId: id });
  const pg = useQ(api.pengaturan.ambil);
  const proses = useM(api.event.prosesTagihan);
  const sinkron = useM(api.event.sinkronUndangan);
  const hapus = useM(api.event.hapus);
  const admin = user?.role === "admin";
  // Lengkapi undangan untuk warga yang ditambah setelah acara dibuat
  useEffect(() => { if (admin && id) sinkron({ eventId: id }).catch(() => {}); }, [admin, id, sinkron]);

  if (d === null) return <Screen><Kosong ikon="calendar-outline" teks="Acara tidak ditemukan atau sudah dihapus." /></Screen>;
  if (!d || !pg) return <Screen><Tunggu /></Screen>;
  const { event: e, undangan, tagihan } = d;
  const terkirim = undangan.filter((x: any) => x.status === "terkirim").length;
  const lewat = e.tanggal < hariIni();
  const tTerkirim = tagihan.filter((x: any) => x.status === "terkirim").length;
  return (
    <Screen>
      <Card>
        <T b size={19}>{e.judul}</T>
        <T>{tglIndo(e.tanggal)}{e.jam ? `, ${e.jam}` : ""}</T>
        <T c={C.muted}>{e.tempat}</T>
        {e.deskripsi ? <T size={13} c={C.muted}>{e.deskripsi}</T> : null}
        <AksiBar items={[
          { label: "Edit", icon: "create-outline", hide: !admin, onPress: () => r.push({ pathname: "/event-form", params: { id } }) },
          { label: "Cetak", icon: "print-outline", onPress: () => jalankan(() => cetakAcara(e, pg, undangan)) },
          { label: "Hapus", icon: "trash-outline", tone: "danger", hide: !admin, onPress: () => konfirmasi(`Hapus “${e.judul}”?`, "Acara beserta antrean undangan dan pengingat tagihannya dihapus.", "Hapus", async () => { const ok = await jalankan(() => hapus({ id }).then(() => true)); if (ok) r.back(); }) },
        ]} />
      </Card>
      <Card>
        <T b>Undangan</T>
        <T c={C.muted} size={13}>Terkirim {terkirim} dari {undangan.length} warga aktif</T>
        {admin && (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Btn icon="logo-whatsapp" label="Kirim lewat WhatsApp" onPress={() => r.push({ pathname: "/blast", params: { eventId: id, jenis: "undangan" } })} disabled={undangan.length === 0} />
            <Btn icon="print-outline" kind="ghost" label="Cetak undangan (1 halaman per warga)" onPress={() => jalankan(() => cetakUndangan(undangan.map((x: any) => x.warga), e, pg))} disabled={undangan.length === 0} />
          </View>
        )}
        {undangan.length === 0 && <T size={13} c={C.muted} s={{ marginTop: 6 }}>Belum ada warga aktif untuk diundang. Tambah atau aktifkan warga di tab Warga, lalu buka lagi layar ini.</T>}
      </Card>
      <Card>
        <T b>Tagihan H+1</T>
        {!lewat && <T c={C.muted} size={13}>Diproses otomatis sehari setelah acara ({tglIndo(e.tanggal)}). Warga yang belum lunas akan masuk antrean pengingat.</T>}
        {lewat && !e.diproses && <T c={C.muted} size={13}>Menunggu proses otomatis (01.00 WIB). Admin bisa memprosesnya sekarang.</T>}
        {e.diproses && <T c={C.muted} size={13}>{tagihan.length} warga belum lunas · pengingat terkirim {tTerkirim}</T>}
        {admin && lewat && !e.diproses && <Btn label="Proses tagihan sekarang" onPress={() => Alert.alert("Proses tagihan?", "Sistem membuat tagihan bulan acara dan antrean pengingat untuk warga yang belum lunas.", [{ text: "Batal" }, { text: "Proses", onPress: () => jalankan(() => proses({ eventId: id })) }])} s={{ marginTop: 8 }} />}
        {admin && e.diproses && tagihan.length > 0 && <Btn icon="logo-whatsapp" label="Kirim pengingat lewat WhatsApp" onPress={() => r.push({ pathname: "/blast", params: { eventId: id, jenis: "tagihan" } })} s={{ marginTop: 8 }} />}
        {e.diproses && tagihan.slice(0, 10).map((x: any) => <T key={x._id} size={13}>{x.status === "terkirim" ? "✓ " : "• "}{x.warga.nama} ({x.warga.noRumah}) — {rp(x.total ?? 0)}</T>)}
      </Card>
    </Screen>
  );
}
