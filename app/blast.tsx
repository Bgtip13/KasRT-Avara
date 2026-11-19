import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Screen, T, Card, Btn, Field, SearchBar, Kosong, C, Tunggu, jalankan } from "../src/ui";
import { isiTemplate, linkWa, acakRentang, tglIndo, rp, TPL_UNDANGAN, TPL_TAGIHAN } from "../src/util";

// Kirim WA lewat tautan wa.me (gratis, tanpa API). Tombol "Kirim" di WhatsApp tetap ditekan manual;
// aplikasi mengatur antrean, memilih banyak penerima, dan memberi jeda acak antar pesan agar tidak tampak seperti spam.
export default function Blast() {
  const { eventId, jenis } = useLocalSearchParams<{ eventId: string; jenis: "undangan" | "tagihan" }>();
  const d = useQ(api.event.detail, { eventId });
  const pg = useQ(api.pengaturan.ambil);
  const tandai = useM(api.event.tandai);
  const sinkron = useM(api.event.sinkronUndangan);
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState<Record<string, boolean>>({});
  const [jalan, setJalan] = useState(false);
  const [antre, setAntre] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const [fase, setFase] = useState<"siap" | "dibuka" | "jeda">("siap");
  const [min, setMin] = useState("20"); const [max, setMax] = useState("45");
  const [auto, setAuto] = useState(true);
  const [sisa, setSisa] = useState(0);
  const dikenal = useRef<Set<string>>(new Set());

  const daftar: any[] = useMemo(() => (d ? (jenis === "tagihan" ? d.tagihan : d.undangan) : []), [d, jenis]);
  // Perbaikan "data warga tidak ditemukan": lengkapi antrean undangan untuk warga yang ditambah setelah acara dibuat
  useEffect(() => { if (jenis !== "tagihan" && eventId) sinkron({ eventId }).catch(() => {}); }, [eventId, jenis, sinkron]);
  // Penerima yang belum terkirim otomatis terpilih, termasuk yang baru muncul setelah sinkron
  useEffect(() => {
    if (!d) return;
    const baru = daftar.filter((x) => !dikenal.current.has(x._id));
    if (baru.length === 0) return;
    baru.forEach((x) => dikenal.current.add(x._id));
    setPilih((p) => ({ ...p, ...Object.fromEntries(baru.filter((x) => x.status === "menunggu").map((x) => [x._id, true])) }));
  }, [d, daftar]);

  const pesan = (a: any) => {
    const e = d!.event;
    const dasar = { nama: a.warga.nama, no_rumah: a.warga.noRumah, rt: pg?.namaRT || "RT" };
    return jenis === "tagihan"
      ? isiTemplate(pg?.tpl_tagihan || TPL_TAGIHAN, { ...dasar, rincian: a.rincian ?? "", total: rp(a.total ?? 0) })
      : isiTemplate(pg?.tpl_undangan || TPL_UNDANGAN, { ...dasar, judul: e.judul, tanggal: tglIndo(e.tanggal), jam: e.jam || "-", tempat: e.tempat });
  };

  const buka = () => { Linking.openURL(linkWa(antre[i].warga.noWa, pesan(antre[i]))); setFase("dibuka"); };

  const lanjut = async (terkirim: boolean) => {
    if (terkirim) await jalankan(() => tandai({ antreanId: antre[i]._id }));
    const n = i + 1;
    if (n >= antre.length) { setJalan(false); Alert.alert("Selesai", "Semua penerima terpilih sudah diproses."); return; }
    setI(n); setSisa(acakRentang(Number(min) || 0, Number(max) || 0)); setFase("jeda");
  };

  // Simpan versi terbaru fungsi/antrean di ref agar efek di bawah tidak perlu berlangganan ulang setiap render
  const terbaru = useRef({ buka, lanjut, antre });
  useEffect(() => { terbaru.current = { buka, lanjut, antre }; });

  // Setelah kembali dari WhatsApp, tanyakan apakah pesan benar terkirim
  useEffect(() => {
    if (!jalan || fase !== "dibuka") return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      const { antre: a, lanjut: lj } = terbaru.current;
      Alert.alert(`Sudah terkirim ke ${a[i].warga.nama}?`, undefined, [
        { text: "Belum / lewati", onPress: () => lj(false) },
        { text: "Sudah", onPress: () => lj(true) },
      ]);
    });
    return () => sub.remove();
  }, [jalan, fase, i]);

  // Hitung mundur jeda, lalu buka WhatsApp berikutnya (atau tunggu tombol).
  // State diubah di dalam callback timer (bukan langsung di badan efek).
  useEffect(() => {
    if (!jalan || fase !== "jeda") return;
    const t = setTimeout(() => {
      if (sisa > 0) setSisa((x) => x - 1);
      else if (auto) terbaru.current.buka();
      else setFase("siap");
    }, sisa > 0 ? 1000 : 0);
    return () => clearTimeout(t);
  }, [jalan, fase, sisa, auto]);

  if (!d || !pg) return <Screen><Tunggu /></Screen>;
  const dipilih = daftar.filter((x) => pilih[x._id]);
  const q = cari.trim().toLowerCase();
  const tampil = daftar.filter((x) => !q || (x.warga.nama + " " + x.warga.noRumah).toLowerCase().includes(q));

  if (jalan)
    return (
      <Screen>
        <Card>
          <T c={C.muted} size={13}>Penerima {i + 1} dari {antre.length}</T>
          <T b size={20}>{antre[i].warga.nama}</T>
          <T c={C.muted}>No. {antre[i].warga.noRumah} · {antre[i].warga.noWa}</T>
        </Card>
        {fase === "jeda" && <Card><T b size={22}>Jeda {sisa} detik</T><T size={13} c={C.muted}>{auto ? "WhatsApp akan terbuka otomatis untuk penerima berikutnya." : "Tombol akan aktif setelah jeda."}</T></Card>}
        {fase === "dibuka" && <T c={C.muted}>Tekan Kirim di WhatsApp, lalu kembali ke aplikasi ini.</T>}
        <Btn label="Buka WhatsApp" disabled={fase !== "siap"} onPress={buka} />
        <Btn kind="danger" label="Berhenti" onPress={() => setJalan(false)} />
      </Screen>
    );

  return (
    <Screen>
      <Card>
        <T b>{jenis === "tagihan" ? "Pengingat tagihan" : "Undangan"}: {d.event.judul}</T>
        <T size={13} c={C.muted}>Pesan dibuat dari template di Pengaturan. Tombol Kirim di WhatsApp tetap Anda tekan sendiri, jadi akun aman dari blokir.</T>
      </Card>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Jeda min (detik)" value={min} onChangeText={setMin} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Jeda maks (detik)" value={max} onChangeText={setMax} keyboardType="number-pad" /></View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T>Buka berikutnya otomatis setelah jeda</T><Switch trackColor={{ true: C.primary, false: "#CBD5EA" }} thumbColor="#fff" value={auto} onValueChange={setAuto} />
      </View>
      <T size={12} c={C.muted}>Saran: jeda acak 20–60 detik, maksimal sekitar 30–50 pesan per sesi.</T>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn kind="ghost" label="Pilih semua" onPress={() => setPilih(Object.fromEntries(daftar.map((x) => [x._id, true])))} s={{ flex: 1 }} />
        <Btn kind="ghost" label="Belum terkirim" onPress={() => setPilih(Object.fromEntries(daftar.filter((x) => x.status === "menunggu").map((x) => [x._id, true])))} s={{ flex: 1 }} />
        <Btn kind="ghost" label="Kosongkan" onPress={() => setPilih({})} s={{ flex: 1 }} />
      </View>
      <SearchBar value={cari} onChangeText={setCari} placeholder="Cari nama atau nomor rumah" />
      {daftar.length === 0 && <Kosong ikon="people-outline" teks={jenis === "tagihan" ? "Tidak ada warga dengan tagihan." : "Belum ada warga aktif yang bisa diundang. Tambah atau aktifkan warga di tab Warga."} />}
      {tampil.map((x) => (
        <Pressable key={x._id} onPress={() => setPilih((p) => ({ ...p, [x._id]: !p[x._id] }))}>
          <Card s={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: pilih[x._id] ? C.primarySoft : C.card }}>
            <Ionicons name={pilih[x._id] ? "checkbox" : "square-outline"} size={22} color={pilih[x._id] ? C.primary : C.muted} />
            <View style={{ flex: 1 }}><T b>{x.warga.nama}</T><T size={12} c={C.muted}>No. {x.warga.noRumah}{jenis === "tagihan" ? ` · ${rp(x.total ?? 0)}` : ""} · WA {x.warga.noWa}</T></View>
            {x.status === "terkirim" && <T size={12} c={C.primary}>✓ terkirim</T>}
          </Card>
        </Pressable>
      ))}
      <Btn label={`Mulai kirim (${dipilih.length})`} disabled={dipilih.length === 0} onPress={() => { setAntre(dipilih); setI(0); setFase("siap"); setJalan(true); }} />
    </Screen>
  );
}
