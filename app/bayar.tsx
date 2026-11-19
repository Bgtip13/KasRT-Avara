import { useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, SearchBar, PilihList, Info, Tunggu, C, jalankan } from "../src/ui";
import { rp, hariIni, namaBulan } from "../src/util";
import { MenuCetak, ItemCetak, itemBayar } from "../src/menu-cetak";

const METODE = ["Tunai", "Transfer", "QRIS"];

export default function Bayar() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const edit = !!id;
  const r = useRouter();
  const kas = (useQ(api.kas.daftar) ?? []).filter((k: any) => k.boleh);
  const warga = useQ(api.warga.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const lama = useQ(api.transaksi.ambilBayar, id ? { id } : "skip");
  const bayar = useM(api.transaksi.bayar);
  const ubah = useM(api.transaksi.ubahBayar);
  const [kasId, setKasId] = useState<string>();
  const [w, setW] = useState<any>(null);
  const [cari, setCari] = useState("");
  const [bulan, setBulan] = useState(1);
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(hariIni());
  const [metode, setMetode] = useState("Tunai");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [resId, setResId] = useState<string | null>(null);
  const baru = useQ(api.transaksi.ambilBayar, resId ? { id: resId } : "skip");
  const hasil: ItemCetak | null = baru ? itemBayar(baru, pg) : null;
  const [menu, setMenu] = useState(false);
  const k = kas.find((x: any) => x._id === kasId);
  const pr = useQ(api.transaksi.pratinjau, !edit && w && kasId ? { wargaId: w._id, kasId } : "skip");
  const q = cari.trim().toLowerCase();
  const saran = useMemo(() => (q.length < 1 ? [] : (warga ?? []).filter((x: any) => x.aktif && (x.nama + " " + x.noRumah).toLowerCase().includes(q)).slice(0, 6)), [q, warga]);

  // Isi form sekali saja saat data pembayaran lama selesai dimuat (disesuaikan saat render, bukan lewat effect)
  const [terisiId, setTerisiId] = useState<string | null>(null);
  if (lama && terisiId !== lama._id) {
    setTerisiId(lama._id);
    setJumlah(String(lama.jumlah)); setTanggal(lama.tanggal); setMetode(lama.metode ?? "Tunai"); setCatatan(lama.catatan ?? "");
  }

  const hitung = (n: number) => { setBulan(n); if (pr) setJumlah(String(pr.nominal * n)); };
  const simpan = async () => {
    setSibuk(true);
    if (edit) {
      const ok = await jalankan(() => ubah({ id, jumlah: Number(jumlah), tanggal, metode, catatan: catatan || undefined }).then(() => true));
      setSibuk(false);
      if (ok) r.back();
      return;
    }
    const res = await jalankan(() => bayar({ wargaId: w._id, kasId, jumlah: Number(jumlah), tanggal, metode, catatan: catatan || undefined }));
    setSibuk(false);
    if (!res) return;
    setResId(res.id);
  };

  if ((edit && lama === undefined) || (resId && !hasil)) return <Screen><Tunggu /></Screen>;

  // Layar sukses setelah mencatat pembayaran baru
  if (hasil) {
    const total = hasil.struk.total;
    return (
      <Screen>
        <Card s={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={34} color={C.primaryDark} /></View>
          <T b size={20}>Pembayaran tersimpan</T>
          <T b size={28} c={C.primary}>{rp(total)}</T>
          <T c={C.muted}>{hasil.struk.nomor} · {hasil.struk.baris[0]?.[1]}</T>
        </Card>
        <Btn icon="print-outline" label="Cetak / kirim kuitansi" onPress={() => setMenu(true)} />
        <Btn kind="ghost" label="Catat pembayaran lagi" onPress={() => { setResId(null); setW(null); setCari(""); setJumlah(""); setCatatan(""); setBulan(1); }} />
        <Btn kind="ghost" label="Selesai" onPress={() => r.back()} />
        <MenuCetak item={menu ? hasil : null} pg={pg} onTutup={() => setMenu(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      {edit ? (
        <Card>
          <T size={12} c={C.muted}>Mengubah pembayaran</T>
          <T b size={16}>{lama?.warga?.nama}</T>
          <Info label="Kas" value={lama?.kas} />
          <Info label="No. kuitansi" value={lama?.noKuitansi} />
          <T size={12} c={C.muted} s={{ marginTop: 6 }}>Warga dan jenis kas tidak bisa diganti. Bila salah, hapus lalu catat ulang. Jumlah yang diubah akan dialokasikan ulang ke tagihan.</T>
        </Card>
      ) : (<>
        <Card s={{ gap: 10 }}>
          <T b>1. Pilih kas</T>
          <Chips>{kas.map((x: any) => <Chip key={x._id} label={x.nama} aktif={kasId === x._id} onPress={() => { setKasId(x._id); setJumlah(x.periode === "bebas" ? "" : String(x.nominal)); setBulan(1); }} />)}</Chips>
          {kas.length === 0 && <T c={C.muted} size={13}>Anda belum ditugaskan ke jenis kas apa pun. Hubungi admin.</T>}
        </Card>
        <Card s={{ gap: 10 }}>
          <T b>2. Pilih warga</T>
          {w ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}><T b>{w.nama}</T><T size={13} c={C.muted}>No. {w.noRumah} · {w.statusHunian}</T></View>
              <Btn small kind="ghost" label="Ganti" onPress={() => { setW(null); setCari(""); }} />
            </View>
          ) : (<>
            <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama atau nomor rumah" />
            {q.length > 0 && <PilihList items={saran.map((x: any) => ({ key: x._id, judul: x.nama, sub: `No. ${x.noRumah}` }))} onPick={(key) => { setW(saran.find((x: any) => x._id === key)); setCari(""); }} kosong="Warga tidak ditemukan." />}
          </>)}
        </Card>
        {pr && k && (
          <Card>
            <T size={13} c={C.muted}>Tarif {k.nama}: {k.periode === "bebas" ? "bebas / sukarela" : `${rp(pr.nominal)}${k.periode === "bulanan" ? " per bulan" : ""}`}</T>
            {pr.tunggakanBulan > 0 && <T c={C.danger} size={13}>Tunggakan: {pr.tunggakanBulan} {k.periode === "bulanan" ? "bulan" : "tagihan"} ({rp(pr.sisa)}){k.periode === "bulanan" ? ` — mulai ${namaBulan(pr.daftarBulan[0])}` : ""}</T>}
            {k.periode === "bulanan" && (<>
              <T size={13} c={C.muted} s={{ marginTop: 6 }}>Bayar untuk berapa bulan?</T>
              <Chips>{[1, 2, 3, 6, 12].map((n) => <Chip key={n} label={`${n} bln`} aktif={bulan === n} onPress={() => hitung(n)} />)}</Chips>
            </>)}
          </Card>
        )}
      </>)}
      <Card s={{ gap: 12 }}>
        <T b>{edit ? "Rincian" : "3. Rincian"}</T>
        <Field label="Jumlah (Rp)" value={jumlah} onChangeText={(t) => setJumlah(t.replace(/\D/g, ""))} keyboardType="number-pad" />
        <Field label="Tanggal (YYYY-MM-DD)" value={tanggal} onChangeText={setTanggal} />
        <Chips>{METODE.map((m) => <Chip key={m} label={m} aktif={metode === m} onPress={() => setMetode(m)} />)}</Chips>
        <Field label="Catatan (opsional)" value={catatan} onChangeText={setCatatan} />
      </Card>
      <Btn label={edit ? "Simpan perubahan" : `Simpan ${jumlah ? rp(Number(jumlah)) : ""}`} loading={sibuk} disabled={(!edit && (!w || !kasId)) || !Number(jumlah)} onPress={simpan} />
    </Screen>
  );
}
