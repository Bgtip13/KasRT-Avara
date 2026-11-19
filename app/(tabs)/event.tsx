import { useState } from "react";
import { useRouter } from "expo-router";
import { useSesi, useQ, useM } from "../../src/session";
import { api } from "../../convex/_generated/api";
import { Screen, T, Card, Btn, SearchBar, AksiBar, Badge, Kosong, Tunggu, konfirmasi, jalankan, C } from "../../src/ui";
import { tglIndo, hariIni } from "../../src/util";
import { cetakAcara } from "../../src/cetak";
import { AcaraWarga } from "../../src/warga-views";

export default function Acara() {
  const { user } = useSesi();
  return user?.role === "warga" ? <AcaraWarga /> : <AcaraStaf />;
}

function AcaraStaf() {
  const { user } = useSesi();
  const r = useRouter();
  const [cari, setCari] = useState("");
  const ev = useQ(api.event.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const hapus = useM(api.event.hapus);
  const admin = user?.role === "admin";
  const q = cari.trim().toLowerCase();
  const hasil = (ev ?? []).filter((e: any) => !q || [e.judul, e.tempat, e.tanggal].join(" ").toLowerCase().includes(q));
  return (
    <Screen tab title="Acara" sub="Kumpulan dan kegiatan warga">
      {admin && <Btn icon="add" label="Acara / kumpulan baru" onPress={() => r.push("/event-form")} />}
      <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama acara atau tempat" />
      {!ev ? <Tunggu /> : hasil.length === 0 ? <Kosong ikon="calendar-outline" teks={q ? "Tidak ada acara yang cocok." : "Belum ada acara. Buat kumpulan warga untuk mengirim undangan dan memicu tagihan H+1."} /> : hasil.map((e: any) => {
        const lewat = e.tanggal < hariIni();
        return (
          <Card key={e._id} onPress={() => r.push(`/event/${e._id}`)}>
            <T b size={16}>{e.judul}</T>
            <T size={13}>{tglIndo(e.tanggal)}{e.jam ? `, ${e.jam}` : ""} · {e.tempat}</T>
            <T size={13} c={C.muted}>Undangan terkirim {e.undanganTerkirim}/{e.undanganTotal}</T>
            <Badge tone={lewat ? "muted" : "info"} label={lewat ? (e.diproses ? "Selesai · tagihan diproses" : "Selesai · tagihan menunggu H+1") : "Akan datang"} />
            <AksiBar items={[
              { label: "Edit", icon: "create-outline", hide: !admin, onPress: () => r.push({ pathname: "/event-form", params: { id: e._id } }) },
              { label: "Cetak", icon: "print-outline", onPress: () => jalankan(() => cetakAcara(e, pg ?? {})) },
              { label: "Hapus", icon: "trash-outline", tone: "danger", hide: !admin, onPress: () => konfirmasi(`Hapus “${e.judul}”?`, "Acara beserta antrean undangan dan pengingat tagihannya dihapus. Tagihan iuran dan pembayaran tidak terpengaruh.", "Hapus", () => jalankan(() => hapus({ id: e._id }))) },
            ]} />
          </Card>
        );
      })}
    </Screen>
  );
}
