import { useRouter } from "expo-router";
import { useSesi, useQ } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, Kosong, Tunggu, C } from "../../src/ui";
import { tglIndo, hariIni } from "../../src/util";

export default function Acara() {
  const { user } = useSesi();
  const r = useRouter();
  const ev = useQ(api.event.daftar);
  return (
    <Screen>
      {user?.role === "admin" && <Btn label="+ Acara / kumpulan baru" onPress={() => r.push("/event-form")} />}
      {!ev ? <Tunggu /> : ev.length === 0 ? <Kosong teks="Belum ada acara. Buat kumpulan warga untuk mengirim undangan dan memicu tagihan H+1." /> : ev.map((e: any) => (
        <Card key={e._id} onPress={() => r.push(`/event/${e._id}`)}>
          <T b>{e.judul}</T>
          <T size={13}>{tglIndo(e.tanggal)}{e.jam ? `, ${e.jam}` : ""} · {e.tempat}</T>
          <T size={13} c={C.muted}>Undangan terkirim {e.undanganTerkirim}/{e.undanganTotal}{e.tanggal < hariIni() ? (e.diproses ? " · tagihan sudah diproses" : " · tagihan menunggu H+1") : ""}</T>
        </Card>
      ))}
    </Screen>
  );
}
