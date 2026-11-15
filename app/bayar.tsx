import { useMemo, useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useRouter } from "expo-router";
import { useQ, useM, useSesi } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, C, jalankan } from "../src/ui";
import { rp, hariIni, namaBulan, isiTemplate, linkWa, tglIndo, TPL_KUITANSI } from "../src/util";

export default function Bayar() {
  const r = useRouter();
  const { user } = useSesi();
  const kas = (useQ(api.kas.daftar) ?? []).filter((k: any) => k.boleh);
  const warga = useQ(api.warga.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const bayar = useM(api.transaksi.bayar);
  const [kasId, setKasId] = useState<string>();
  const [w, setW] = useState<any>(null);
  const [cari, setCari] = useState("");
  const [bulan, setBulan] = useState(1);
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(hariIni());
  const [metode, setMetode] = useState("Tunai");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const k = kas.find((x: any) => x._id === kasId);
  const pr = useQ(api.transaksi.pratinjau, w && kasId ? { wargaId: w._id, kasId } : "skip");
  const saran = useMemo(() => (cari.length < 1 ? [] : (warga ?? []).filter((x: any) => x.aktif && (x.nama + " " + x.noRumah).toLowerCase().includes(cari.toLowerCase())).slice(0, 6)), [cari, warga]);

  const hitung = (n: number) => { setBulan(n); if (pr) setJumlah(String(pr.nominal * n)); };
  const simpan = async () => {
    setSibuk(true);
    const res = await jalankan(() => bayar({ wargaId: w._id, kasId, jumlah: Number(jumlah), tanggal, metode, catatan: catatan || undefined }));
    setSibuk(false);
    if (!res) return;
    const pesan = isiTemplate(pg?.tpl_kuitansi || TPL_KUITANSI, { no_kuitansi: res.noKuitansi, rt: pg?.namaRT || "RT", nama: w.nama, no_rumah: w.noRumah, kas: k.nama, jumlah: rp(Number(jumlah)), tanggal: tglIndo(tanggal), petugas: user?.nama ?? "" });
    Alert.alert("Tersimpan", `Kuitansi ${res.noKuitansi}`, [
      { text: "Selesai", onPress: () => r.back() },
      { text: "Kirim kuitansi WA", onPress: () => { Linking.openURL(linkWa(w.noWa, pesan)); r.back(); } },
    ]);
  };

  return (
    <Screen>
      <T c={C.muted} size={13}>Kas</T>
      <Chips>{kas.map((x: any) => <Chip key={x._id} label={x.nama} aktif={kasId === x._id} onPress={() => { setKasId(x._id); setJumlah(x.periode === "bebas" ? "" : String(x.nominal)); setBulan(1); }} />)}</Chips>
      {kas.length === 0 && <T c={C.muted}>Anda belum ditugaskan ke jenis kas apa pun. Hubungi admin.</T>}
      {w ? (
        <Card><T b>{w.nama}</T><T size={13} c={C.muted}>No. {w.noRumah} · {w.statusHunian}</T><Btn kind="ghost" label="Ganti warga" onPress={() => { setW(null); setCari(""); }} s={{ marginTop: 6 }} /></Card>
      ) : (<>
        <Field label="Cari warga (nama / nomor rumah)" value={cari} onChangeText={setCari} />
        {saran.map((x: any) => <Card key={x._id} onPress={() => setW(x)}><T b>{x.nama}</T><T size={13} c={C.muted}>No. {x.noRumah}</T></Card>)}
      </>)}
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
      <Field label="Jumlah (Rp)" value={jumlah} onChangeText={(t) => setJumlah(t.replace(/\D/g, ""))} keyboardType="number-pad" />
      <Field label="Tanggal (YYYY-MM-DD)" value={tanggal} onChangeText={setTanggal} />
      <Chips>{["Tunai", "Transfer"].map((m) => <Chip key={m} label={m} aktif={metode === m} onPress={() => setMetode(m)} />)}</Chips>
      <Field label="Catatan (opsional)" value={catatan} onChangeText={setCatatan} />
      <Btn label={`Simpan ${jumlah ? rp(Number(jumlah)) : ""}`} loading={sibuk} disabled={!w || !kasId || !Number(jumlah)} onPress={simpan} />
    </Screen>
  );
}
