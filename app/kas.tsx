import { useRouter } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, AksiBar, Badge, Kosong, Tunggu, konfirmasi, jalankan, C } from "../src/ui";
import { rp } from "../src/util";
import { cetakKas } from "../src/cetak";

const NAMA_PERIODE: any = { bulanan: "per bulan", sekali: "sekali bayar", bebas: "bebas / sukarela" };
export default function Kas() {
  const r = useRouter();
  const kas = useQ(api.kas.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const hapus = useM(api.kas.hapus);
  return (
    <Screen>
      <Btn icon="add" label="Tambah jenis kas" onPress={() => r.push("/kas-form")} />
      {!kas ? <Tunggu /> : kas.length === 0 ? <Kosong ikon="wallet-outline" teks="Belum ada jenis kas. Tambah iuran wajib, jimpitan, atau kas lain." /> : kas.map((k: any) => (
        <Card key={k._id} s={{ opacity: k.aktif ? 1 : 0.6 }}>
          <T b size={16}>{k.nama}</T>
          <T size={13}>{k.periode === "bebas" ? NAMA_PERIODE.bebas : `${rp(k.nominal)} ${NAMA_PERIODE[k.periode]}`}{k.nominalKontrak != null ? ` · kontrak ${rp(k.nominalKontrak)}` : ""}</T>
          <T size={13} c={C.muted}>Saldo {rp(k.saldo)} · Petugas: {k.namaPetugas.join(", ") || "belum ada"}</T>
          {!k.aktif && <Badge tone="muted" label="Nonaktif" />}
          <Badge tone={k.qrisUrl ? "info" : "muted"} label={k.qrisUrl ? "QRIS tersedia" : "Belum ada QRIS"} />
          <AksiBar items={[
            { label: "Edit", icon: "create-outline", onPress: () => r.push({ pathname: "/kas-form", params: { id: k._id } }) },
            { label: "Cetak", icon: "print-outline", onPress: () => jalankan(() => cetakKas(k, pg ?? {})) },
            { label: "Hapus", icon: "trash-outline", tone: "danger", onPress: () => konfirmasi(`Hapus kas “${k.nama}”?`, "Hanya bisa jika belum ada transaksi. Kas yang sudah dipakai sebaiknya dinonaktifkan lewat Edit.", "Hapus", () => jalankan(() => hapus({ id: k._id }))) },
          ]} />
        </Card>
      ))}
    </Screen>
  );
}
