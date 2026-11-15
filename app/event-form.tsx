import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQ, useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, Btn, Field, jalankan } from "../src/ui";
import { hariIni } from "../src/util";

export default function EventForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const r = useRouter();
  const buat = useM(api.event.buat);
  const d = useQ(api.event.detail, id ? { eventId: id } : "skip");
  const [f, setF] = useState({ judul: "Kumpulan Warga", tanggal: hariIni(), jam: "19.30 WIB", tempat: "", deskripsi: "" });
  const [sibuk, setSibuk] = useState(false);
  useEffect(() => { if (id && d?.event) setF({ judul: d.event.judul, tanggal: d.event.tanggal, jam: d.event.jam ?? "", tempat: d.event.tempat, deskripsi: d.event.deskripsi ?? "" }); }, [id, d]);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Screen>
      <Field label="Nama acara" value={f.judul} onChangeText={set("judul")} />
      <Field label="Tanggal (YYYY-MM-DD)" value={f.tanggal} onChangeText={set("tanggal")} />
      <Field label="Jam" value={f.jam} onChangeText={set("jam")} />
      <Field label="Tempat" value={f.tempat} onChangeText={set("tempat")} placeholder="mis. Rumah Pak RT No. 1" />
      <Field label="Keterangan (opsional)" value={f.deskripsi} onChangeText={set("deskripsi")} multiline />
      <Btn label={id ? "Simpan perubahan" : "Buat acara & siapkan undangan"} loading={sibuk} onPress={async () => {
        setSibuk(true);
        const ok = await jalankan(() => buat({ id: id || undefined, ...f, jam: f.jam || undefined, deskripsi: f.deskripsi || undefined }).then(() => true));
        setSibuk(false); if (ok) r.back();
      }} />
    </Screen>
  );
}
