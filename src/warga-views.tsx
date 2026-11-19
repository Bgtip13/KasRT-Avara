import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQ, useM, useSesi } from "./session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Hero, Badge, Btn, Judul, Kosong, Tunggu, AksiBar, konfirmasi, jalankan, C } from "./ui";
import { rp, namaBulan, tglIndo, hariIni } from "./util";
import { cetakBukti } from "./cetak";

function BelumTerhubung() {
  return (
    <Card>
      <T b>Akun belum terhubung dengan data warga</T>
      <T size={13} c={C.muted}>Hubungi pengurus RT agar akun ini dihubungkan dengan data rumah Anda. Setelah itu tunggakan dan riwayat pembayaran Anda muncul di sini.</T>
    </Card>
  );
}

// Beranda untuk warga: cek tunggakan sendiri
export function BerandaWarga() {
  const { user } = useSesi();
  const r = useRouter();
  const d = useQ(api.akun.ringkasan);
  const pg = useQ(api.pengaturan.ambil);
  const judul = `Halo, ${(user?.nama ?? "").split(" ")[0]}`;
  if (!d) return <Screen tab title={judul}><Tunggu /></Screen>;
  if (!d.terhubung) return <Screen tab title={judul}><BelumTerhubung /></Screen>;
  const lunas = d.totalTunggakan === 0;
  return (
    <Screen tab title={judul} sub={`Rumah No. ${d.warga.noRumah}${d.warga.blok ? ` · Blok ${d.warga.blok}` : ""}`}>
      <Hero>
        <T c="rgba(255,255,255,0.78)" size={13}>{lunas ? "Status iuran" : `Tunggakan sampai ${namaBulan(d.bulan)}`}</T>
        {lunas ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
            <Ionicons name="checkmark-circle" size={34} color="#fff" />
            <T c="#fff" b size={26}>Tidak ada tunggakan</T>
          </View>
        ) : <T c="#fff" b size={36} s={{ letterSpacing: -0.5 }}>{rp(d.totalTunggakan)}</T>}
        <T c="rgba(255,255,255,0.78)" size={13} s={{ marginTop: 4 }}>{lunas ? "Terima kasih, iuran Anda sudah lunas." : "Hubungi petugas kas untuk melunasi."}</T>
      </Hero>

      {pg?.qrisAktif !== "0" && <Btn icon="qr-code-outline" label="Bayar dengan QRIS" onPress={() => r.push("/bayar-qris" as any)} />}

      {d.kas.length > 0 && <Judul>Rincian per kas</Judul>}
      {d.kas.map((k: any) => (
        <Card key={k.kasId}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <T b size={16} s={{ flexShrink: 1 }}>{k.nama}</T>
            {k.sisa > 0 ? <T b c={C.danger}>{rp(k.sisa)}</T> : <Badge label="Lunas" />}
          </View>
          {k.periode === "bulanan" && (
            <T size={13} c={k.statusBulanIni === "belum" ? C.danger : C.muted}>
              {k.statusBulanIni === "lunas" ? `Bulan ${namaBulan(d.bulan)} sudah lunas` : k.statusBulanIni === "belum" ? `Bulan ${namaBulan(d.bulan)} belum lunas` : `Tagihan ${namaBulan(d.bulan)} belum dibuat`}
            </T>
          )}
          {k.jumlahTagihan > 0 && (
            <T size={13} c={C.danger}>
              {k.periode === "bulanan" ? `${k.jumlahTagihan} bulan belum dibayar: ${k.daftarPeriode.map((p: string) => namaBulan(p)).join(", ")}` : "Belum dibayar"}
            </T>
          )}
          {k.lunasSampai && k.sisa === 0 && <T size={13} c={C.muted}>Lunas sampai {namaBulan(k.lunasSampai)}</T>}
        </Card>
      ))}

      <Card>
        <T size={13} c={C.muted}>Dibayar tahun ini</T>
        <T b size={22}>{rp(d.dibayarTahunIni)}</T>
      </Card>
      <Btn kind="ghost" label="Lihat riwayat pembayaran" onPress={() => r.navigate("/transaksi" as any)} />
    </Screen>
  );
}

// Riwayat pembayaran milik warga sendiri
export function RiwayatWarga() {
  const d = useQ(api.akun.ringkasan);
  const pg = useQ(api.pengaturan.ambil);
  const aju = useQ(api.pengajuan.milikSaya);
  const batalSaya = useM(api.pengajuan.batalSaya);
  const proses = (aju ?? []).filter((x: any) => x.status !== "disetujui");
  return (
    <Screen tab title="Riwayat" sub="Pembayaran kas atas nama rumah Anda">
      {proses.length > 0 && <Judul>Konfirmasi pembayaran QRIS</Judul>}
      {proses.map((x: any) => (
        <Card key={x._id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <T b s={{ flexShrink: 1 }}>{x.kas}</T><T b>{rp(x.jumlah)}</T>
          </View>
          <T size={13} c={C.muted}>{tglIndo(x.tanggal)}</T>
          <Badge tone={x.status === "menunggu" ? "warn" : "danger"} label={x.status === "menunggu" ? "Menunggu pengecekan petugas" : `Ditolak${x.alasanTolak ? `: ${x.alasanTolak}` : ""}`} />
          {x.status === "menunggu" && <AksiBar items={[{ label: "Batalkan pengajuan", icon: "close-circle-outline", tone: "danger", onPress: () => konfirmasi("Batalkan pengajuan?", "Bukti yang sudah dikirim ikut dihapus.", "Batalkan", () => jalankan(() => batalSaya({ id: x._id }))) }]} />}
        </Card>
      ))}
      {proses.length > 0 && <Judul>Pembayaran tercatat</Judul>}
      {!d ? <Tunggu /> : !d.terhubung ? <BelumTerhubung /> : d.riwayat.length === 0 ? <Kosong ikon="receipt-outline" teks="Belum ada pembayaran tercatat." /> : d.riwayat.map((x: any) => (
        <Card key={x._id}>
          <View style={{ opacity: x.batal ? 0.55 : 1, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <T b s={{ flexShrink: 1 }}>{x.kas}</T>
              <T b c={x.batal ? C.muted : C.primary}>{x.batal ? "" : "+"}{rp(x.jumlah)}</T>
            </View>
            <T size={13} c={C.muted}>{tglIndo(x.tanggal)}{x.metode ? ` · ${x.metode}` : ""}</T>
            <T size={12} c={C.muted}>{x.noKuitansi} · dicatat {x.petugas}</T>
          </View>
          {x.batal && <Badge tone="danger" label={`Dibatalkan${x.alasanBatal ? `: ${x.alasanBatal}` : ""}`} />}
          {!x.batal && d.terhubung && <AksiBar items={[{ label: "Cetak kuitansi", icon: "print-outline", onPress: () => jalankan(() => cetakBukti({ judul: "KUITANSI", nomor: x.noKuitansi, tanggal: tglIndo(x.tanggal), baris: [["Telah terima dari", d.warga.nama], ["Rumah No", d.warga.noRumah], ["Untuk pembayaran", x.kas], ...(x.metode ? [["Metode", x.metode] as [string, string]] : [])], jumlah: x.jumlah, ttd: [["Penyetor", d.warga.nama], ["Petugas kas", x.petugas]] }, pg ?? {})) }]} />}
        </Card>
      ))}
    </Screen>
  );
}

// Daftar acara (hanya lihat) untuk warga
export function AcaraWarga() {
  const ev = useQ(api.event.untukWarga);
  return (
    <Screen tab title="Acara" sub="Kumpulan dan kegiatan warga">
      {!ev ? <Tunggu /> : ev.length === 0 ? <Kosong teks="Belum ada acara." /> : ev.map((e: any) => (
        <Card key={e._id}>
          <T b size={16}>{e.judul}</T>
          <T size={13}>{tglIndo(e.tanggal)}{e.jam ? `, ${e.jam}` : ""}</T>
          <T size={13} c={C.muted}>{e.tempat}</T>
          {!!e.deskripsi && <T size={13} c={C.muted}>{e.deskripsi}</T>}
          {e.tanggal >= hariIni() && <View style={{ marginTop: 6 }}><Badge label="Akan datang" /></View>}
        </Card>
      ))}
    </Screen>
  );
}
