import { useState } from "react";
import { Alert, Image, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, Kosong, Tunggu, C, jalankan } from "../src/ui";
import { rp } from "../src/util";

function Langkah({ n, judul, children }: { n: number; judul: string; children?: React.ReactNode }) {
  return (
    <Card s={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}><T c="#fff" b size={13}>{n}</T></View>
        <T b size={16}>{judul}</T>
      </View>
      {children}
    </Card>
  );
}

// Warga membayar mandiri lewat QRIS lalu mengirim bukti. Petugas memeriksa di menu "Konfirmasi pembayaran".
export default function BayarQris() {
  const r = useRouter();
  const d = useQ(api.akun.ringkasan);
  const pg = useQ(api.pengaturan.ambil);
  const urlBukti = useM(api.pengajuan.buatUrlBukti);
  const ajukan = useM(api.pengajuan.buat);
  const [kasId, setKasId] = useState<string>();
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [bukti, setBukti] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);

  if (!d || !pg) return <Screen><Tunggu /></Screen>;
  if (!d.terhubung) return <Screen><Kosong ikon="link-outline" teks="Akun Anda belum terhubung dengan data rumah. Hubungi pengurus RT." /></Screen>;
  if (pg.qrisAktif === "0") return <Screen><Kosong ikon="qr-code-outline" teks="Pembayaran mandiri lewat QRIS sedang dinonaktifkan pengurus. Silakan bayar ke petugas kas." /></Screen>;

  if (selesai) return (
    <Screen>
      <Card s={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={34} color={C.primaryDark} /></View>
        <T b size={20}>Konfirmasi terkirim</T>
        <T c={C.muted} s={{ textAlign: "center" }}>Petugas akan memeriksa pembayaran Anda. Setelah disetujui, pembayaran tercatat dan kuitansi muncul di Riwayat.</T>
      </Card>
      <Btn label="Lihat riwayat" onPress={() => r.replace("/transaksi" as any)} />
      <Btn kind="ghost" label="Selesai" onPress={() => r.back()} />
    </Screen>
  );

  // Hanya kas yang punya QRIS sendiri yang bisa dibayar mandiri
  const opsi = d.opsiBayar.filter((x: any) => !!x.qrisUrl);
  const tersembunyi = d.opsiBayar.length - opsi.length;
  if (opsi.length === 0) return <Screen><Kosong ikon="qr-code-outline" teks="Belum ada iuran yang menyediakan QRIS. Silakan bayar ke petugas kas." /></Screen>;
  const k = opsi.find((x: any) => x.kasId === kasId);
  const pilihKas = (x: any) => { setKasId(x.kasId); setJumlah(x.sisa > 0 ? String(x.sisa) : x.nominal > 0 ? String(x.nominal) : ""); };

  const ambilBukti = async () => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) { Alert.alert("Izin ditolak", "Izinkan akses galeri di Pengaturan HP."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
    if (!res.canceled) setBukti(res.assets[0].uri);
  };

  const kirim = async () => {
    setSibuk(true);
    const ok = await jalankan(async () => {
      const url = await urlBukti();
      const blob = await (await fetch(bukti!)).blob();
      const up = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
      if (!up.ok) throw new Error("unggah gagal");
      const { storageId } = await up.json();
      await ajukan({ kasId, jumlah: Number(jumlah), catatan: catatan || undefined, buktiId: storageId });
      return true;
    });
    setSibuk(false);
    if (ok) setSelesai(true);
  };

  return (
    <Screen>
      <Langkah n={1} judul="Pilih iuran">
        <Chips>{opsi.map((x: any) => <Chip key={x.kasId} label={x.nama} aktif={kasId === x.kasId} onPress={() => pilihKas(x)} />)}</Chips>
        {k && <T size={13} c={k.sisa > 0 ? C.danger : C.muted}>{k.sisa > 0 ? `Tunggakan Anda: ${rp(k.sisa)}` : k.periode === "bebas" ? "Iuran sukarela, isi nominal bebas." : "Tidak ada tunggakan. Anda bisa bayar di muka."}{k.nominal > 0 ? ` Tarif ${rp(k.nominal)}${k.periode === "bulanan" ? " per bulan" : ""}.` : ""}</T>}
        {tersembunyi > 0 && <T size={12} c={C.muted}>Iuran yang tidak tampil belum menyediakan QRIS. Bayar ke petugas kas.</T>}
      </Langkah>

      {k && <Langkah n={2} judul="Tentukan nominal">
        {k.periode === "bulanan" && k.nominal > 0 && <Chips>{[1, 2, 3, 6, 12].map((n) => <Chip key={n} label={`${n} bln`} aktif={jumlah === String(k.nominal * n)} onPress={() => setJumlah(String(k.nominal * n))} />)}</Chips>}
        {k.sisa > 0 && <Btn small kind="soft" label={`Lunasi tunggakan (${rp(k.sisa)})`} onPress={() => setJumlah(String(k.sisa))} />}
        <Field label="Jumlah (Rp)" value={jumlah} onChangeText={(t) => setJumlah(t.replace(/\D/g, ""))} keyboardType="number-pad" />
      </Langkah>}

      {k && !!Number(jumlah) && <Langkah n={3} judul={`Bayar ${rp(Number(jumlah))} lewat QRIS`}>
        <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12 }}>
          <Image source={{ uri: k.qrisUrl }} style={{ width: "100%", aspectRatio: 1 }} resizeMode="contain" />
          {!!(k.qrisNama || pg.qrisNama) && <T b s={{ marginTop: 6 }}>{k.qrisNama || pg.qrisNama}</T>}
        </View>
        <T size={13} c={C.muted}>Buka m-banking / e-wallet, pindai QRIS untuk {k.nama} ini (atau tangkap layar lalu pilih “dari galeri”), dan masukkan nominal persis {rp(Number(jumlah))}.</T>
        {!!(k.qrisCatatan || pg.qrisCatatan) && <T size={13} c={C.muted}>{k.qrisCatatan || pg.qrisCatatan}</T>}
      </Langkah>}

      {k && !!Number(jumlah) && <Langkah n={4} judul="Kirim bukti pembayaran">
        {bukti && <Image source={{ uri: bukti }} style={{ height: 220, borderRadius: 12 }} resizeMode="contain" />}
        <Btn kind="soft" icon="images-outline" label={bukti ? "Ganti bukti" : "Pilih tangkapan layar bukti"} onPress={ambilBukti} />
        <Field label="Catatan (opsional)" value={catatan} onChangeText={setCatatan} placeholder="mis. iuran Nov–Des" />
        <Btn label="Kirim konfirmasi" loading={sibuk} disabled={!bukti} onPress={kirim} />
        <T size={12} c={C.muted}>Pembayaran baru tercatat setelah petugas memeriksa dan menyetujui.</T>
      </Langkah>}
    </Screen>
  );
}
