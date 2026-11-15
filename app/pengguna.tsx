import { useMemo, useState } from "react";
import { Alert, Linking, Share, View } from "react-native";
import { useQ, useM, NAMA_ROLE, Role } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, Chip, Chips, Judul, Badge, Avatar, Tunggu, C, jalankan, pesanError } from "../src/ui";
import { linkWa } from "../src/util";

const SEMUA: Role[] = ["admin", "petugas", "pengawas", "warga"];
const PENGURUS: Role[] = ["admin", "petugas", "pengawas"];

export default function Pengguna() {
  const us = useQ(api.users.daftar);
  const warga = useQ(api.warga.daftar);
  const pg = useQ(api.pengaturan.ambil);
  const buat = useM(api.users.buat);
  const ubah = useM(api.users.ubah);
  const reset = useM(api.users.resetPin);
  const massal = useM(api.users.buatMassalWarga);

  const [nama, setNama] = useState(""); const [phone, setPhone] = useState(""); const [role, setRole] = useState<Role>("petugas"); const [pin, setPin] = useState("");
  const [cari, setCari] = useState(""); const [pilih, setPilih] = useState<any>(null);
  const [saring, setSaring] = useState<"semua" | "pengurus" | "warga">("semua");
  const [hasil, setHasil] = useState<{ dibuat: any[]; dilewati: any[]; jalan: boolean }>({ dibuat: [], dilewati: [], jalan: false });

  const rt = pg?.namaRT || "RT";
  const pesanAkun = (judulNama: string, hp: string, pinAwal: string, isWarga: boolean) =>
    `Akun Kas ${rt}\nNama: ${judulNama}\nNomor: ${hp}\nPIN awal: ${pinAwal}\n\n${isWarga ? "Dengan akun ini Anda bisa mengecek tunggakan dan riwayat pembayaran kas sendiri.\n\n" : ""}PIN ini wajib diganti saat masuk pertama kali. Jangan dibagikan ke orang lain.`;

  const tampilPin = (judul: string, n: string, hp: string, pinAwal: string, isWarga: boolean) => {
    const pesan = pesanAkun(n, hp, pinAwal, isWarga);
    Alert.alert(judul, `${n}\nPIN awal: ${pinAwal}\n\nPIN hanya ditampilkan sekarang. Berikan ke yang bersangkutan; mereka wajib menggantinya saat masuk pertama.`, [
      { text: "Tutup" },
      { text: "Bagikan", onPress: () => Share.share({ message: pesan }) },
      { text: "Kirim WA", onPress: () => Linking.openURL(linkWa(hp, pesan)) },
    ]);
  };

  const wargaPunyaAkun = useMemo(() => new Set((us ?? []).filter((u: any) => u.wargaId).map((u: any) => u.wargaId)), [us]);
  const belumPunya = useMemo(() => (warga ?? []).filter((w: any) => w.aktif && !wargaPunyaAkun.has(w._id)), [warga, wargaPunyaAkun]);
  const saran = useMemo(() => (cari.length < 1 ? [] : belumPunya.filter((w: any) => (w.nama + " " + w.noRumah).toLowerCase().includes(cari.toLowerCase())).slice(0, 5)), [cari, belumPunya]);

  const pilihWarga = (w: any) => { setPilih(w); setNama(w.nama); setPhone(w.noWa); setCari(""); };
  const gantiRole = (r: Role) => { setRole(r); if (r !== "warga") setPilih(null); };
  const bisaBuat = nama.trim() && phone.length >= 9 && (role !== "warga" || !!pilih) && (pin.length === 0 || pin.length === 6);

  const buatSemua = () => Alert.alert(
    "Buat akun untuk semua warga?",
    `${belumPunya.length} warga aktif belum punya akun. Setiap warga mendapat PIN awal acak yang wajib diganti saat masuk pertama. Nomor WA yang tidak valid atau dobel dilewati.`,
    [{ text: "Batal" }, { text: "Buat", onPress: async () => {
      setHasil({ dibuat: [], dilewati: [], jalan: true });
      const semua: any[] = []; let lewat: any[] = [];
      try {
        for (let i = 0; i < 100; i++) {
          const r = await massal({ batas: 5 });
          semua.push(...r.dibuat); lewat = r.dilewati;
          setHasil({ dibuat: [...semua], dilewati: lewat, jalan: true });
          if (r.sisa <= 0 || r.dibuat.length === 0) break;
        }
      } catch (e) { Alert.alert("Gagal", pesanError(e)); }
      setHasil((h) => ({ ...h, jalan: false }));
    } }],
  );

  const tampil = (us ?? []).filter((u: any) => saring === "semua" || (saring === "warga" ? u.role === "warga" : u.role !== "warga"));

  return (
    <Screen>
      <Card s={{ gap: 12 }}>
        <T b size={17}>Buat akun baru</T>
        <T size={13} c={C.muted}>Sistem membuat PIN awal acak. Pengguna wajib menggantinya saat masuk pertama.</T>
        <T size={13} c={C.muted} s={{ fontWeight: "600" }}>Peran</T>
        <Chips>{SEMUA.map((k) => <Chip key={k} label={NAMA_ROLE[k]} aktif={role === k} onPress={() => gantiRole(k)} />)}</Chips>
        <T size={12} c={C.muted}>
          {role === "admin" ? "Pemilik aplikasi: akses penuh." : role === "petugas" ? "Mencatat pembayaran & pengeluaran untuk kas yang ditugaskan." : role === "pengawas" ? "Pengurus RT: melihat semua data dan laporan, tanpa bisa mengubah." : "Warga: hanya melihat tunggakan dan riwayat pembayaran rumahnya sendiri."}
        </T>
        {role === "warga" && (pilih ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.primarySoft, borderRadius: 14, padding: 12 }}>
            <Avatar nama={pilih.nama} size={38} />
            <View style={{ flex: 1 }}><T b>{pilih.nama}</T><T size={13} c={C.muted}>Rumah No. {pilih.noRumah}</T></View>
            <Btn kind="ghost" label="Ganti" onPress={() => { setPilih(null); setNama(""); setPhone(""); }} s={{ paddingVertical: 8 }} />
          </View>
        ) : (<>
          <Field label="Hubungkan dengan data warga (nama / nomor rumah)" value={cari} onChangeText={setCari} />
          {saran.map((w: any) => <Card key={w._id} onPress={() => pilihWarga(w)} s={{ padding: 12 }}><T b>{w.nama}</T><T size={13} c={C.muted}>No. {w.noRumah}</T></Card>)}
          {cari.length > 0 && saran.length === 0 && <T size={13} c={C.muted}>Tidak ada warga yang cocok, atau warga itu sudah punya akun.</T>}
        </>))}
        <Field label="Nama" value={nama} onChangeText={setNama} />
        <Field label="Nomor WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="PIN awal (kosongkan untuk acak)" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />
        <Btn label="Buat akun" disabled={!bisaBuat} onPress={async () => {
          const r = await jalankan(() => buat({ nama, phone, role, pin: pin || undefined, wargaId: role === "warga" ? pilih?._id : undefined }));
          if (r) { tampilPin("Akun dibuat", nama, phone, r.pin, role === "warga"); setNama(""); setPhone(""); setPin(""); setPilih(null); }
        }} />
      </Card>

      <Card s={{ gap: 8 }}>
        <T b size={17}>Akun untuk seluruh warga</T>
        <T size={13} c={C.muted}>{us && warga ? `${belumPunya.length} warga aktif belum punya akun.` : "Memuat…"} Dengan akun, warga bisa mengecek tunggakan dan riwayat pembayaran mereka sendiri.</T>
        <Btn label={hasil.jalan ? `Membuat akun… (${hasil.dibuat.length})` : "Buat akun semua warga"} loading={hasil.jalan} disabled={!belumPunya.length} onPress={buatSemua} />
      </Card>

      {(hasil.dibuat.length > 0 || hasil.dilewati.length > 0) && (
        <Card s={{ gap: 10 }}>
          <T b size={17}>Hasil: {hasil.dibuat.length} akun dibuat</T>
          <T size={13} c={C.danger}>PIN hanya ditampilkan di sini. Kirim ke masing-masing warga sebelum menutup layar ini. Kalau terlewat, gunakan Reset PIN.</T>
          {hasil.dibuat.map((d: any) => (
            <View key={d.phone} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}><T b>{d.nama}</T><T size={12} c={C.muted}>No. {d.noRumah} · PIN {d.pin}</T></View>
              <Btn kind="ghost" label="Kirim WA" onPress={() => Linking.openURL(linkWa(d.phone, pesanAkun(d.nama, d.phone, d.pin, true)))} s={{ paddingVertical: 8, paddingHorizontal: 12 }} />
            </View>
          ))}
          {hasil.dilewati.length > 0 && <>
            <T b size={13} s={{ marginTop: 6 }}>Dilewati ({hasil.dilewati.length})</T>
            {hasil.dilewati.map((d: any, i: number) => <T key={i} size={12} c={C.muted}>{d.nama} (No. {d.noRumah}): {d.alasan}</T>)}
          </>}
        </Card>
      )}

      <Judul>Daftar pengguna</Judul>
      <Chips>
        <Chip label="Semua" aktif={saring === "semua"} onPress={() => setSaring("semua")} />
        <Chip label="Pengurus" aktif={saring === "pengurus"} onPress={() => setSaring("pengurus")} />
        <Chip label="Warga" aktif={saring === "warga"} onPress={() => setSaring("warga")} />
      </Chips>
      {!us ? <Tunggu /> : tampil.map((u: any) => {
        const isWarga = u.role === "warga";
        return (
          <Card key={u._id} s={{ opacity: u.aktif ? 1 : 0.55, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar nama={u.nama} />
              <View style={{ flex: 1, gap: 2 }}>
                <T b>{u.nama}</T>
                <T size={13} c={C.muted}>{u.phone}{isWarga && u.noRumah ? ` · Rumah ${u.noRumah}` : ""}</T>
              </View>
              <Badge label={NAMA_ROLE[u.role as Role].split(" (")[0]} tone={isWarga ? "muted" : "info"} />
            </View>
            <T size={12} c={C.muted}>{u.wajibGanti ? "Belum mengganti PIN awal" : "Aktif"}{u.aktif ? "" : " · dinonaktifkan"}</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Btn kind="ghost" label="Reset PIN" onPress={() => Alert.alert("Reset PIN?", `${u.nama} akan keluar dari semua perangkat dan mendapat PIN awal baru yang wajib diganti.`, [{ text: "Batal" }, { text: "Reset", onPress: async () => { const r = await jalankan(() => reset({ id: u._id })); if (r) tampilPin("PIN direset", u.nama, u.phone, r.pin, isWarga); } }])} s={{ flex: 1, paddingVertical: 10 }} />
              <Btn kind="ghost" label={u.aktif ? "Nonaktifkan" : "Aktifkan"} onPress={() => jalankan(() => ubah({ id: u._id, nama: u.nama, role: u.role, aktif: !u.aktif }))} s={{ flex: 1, paddingVertical: 10 }} />
            </View>
            {!isWarga && <Chips>{PENGURUS.filter((k) => k !== u.role).map((k) => <Chip key={k} label={`→ ${NAMA_ROLE[k].split(" (")[0]}`} onPress={() => jalankan(() => ubah({ id: u._id, nama: u.nama, role: k, aktif: u.aktif }))} />)}</Chips>}
          </Card>
        );
      })}
    </Screen>
  );
}
