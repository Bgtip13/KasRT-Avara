import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import { useM } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Field, C, jalankan } from "../src/ui";
import { parseBaris, Baris } from "../src/util";

export default function Impor() {
  const r = useRouter();
  const impor = useM(api.warga.impor);
  const [link, setLink] = useState("");
  const [baris, setBaris] = useState<Baris[] | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const dariSheet = (wb: XLSX.WorkBook) => { setBaris(parseBaris(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }))); };

  const pilihFile = () => jalankan(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv", "text/comma-separated-values", "*/*"], copyToCacheDirectory: true });
    if (res.canceled) return;
    const buf = await (await fetch(res.assets[0].uri)).arrayBuffer();
    dariSheet(XLSX.read(buf, { type: "array" }));
  });

  const ambilSheet = () => jalankan(async () => {
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) { Alert.alert("Link tidak dikenali", "Tempel link Google Sheet lengkap (https://docs.google.com/spreadsheets/d/...)."); return; }
    const gid = link.match(/[#&?]gid=(\d+)/)?.[1];
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`);
    const teks = await res.text();
    if (!res.ok || teks.trim().startsWith("<")) { Alert.alert("Tidak bisa dibuka", "Pastikan sheet dibagikan sebagai “Siapa saja yang memiliki link: Pelihat”."); return; }
    dariSheet(XLSX.read(teks, { type: "string" }));
  });

  const bagus = baris?.filter((b) => !b.masalah) ?? [];
  const bermasalah = baris?.filter((b) => b.masalah) ?? [];
  return (
    <Screen>
      <Card>
        <T b>Header kolom (baris pertama)</T>
        <T size={13} c={C.muted}>nama | no_rumah | no_wa | status_hunian (tetap/kontrak) | blok | catatan</T>
        <T size={13} c={C.muted}>Kolom blok dan catatan boleh kosong. Nomor WA boleh 0812… atau 62812…</T>
      </Card>
      <Btn label="Pilih file Excel / CSV" onPress={pilihFile} />
      <Field label="…atau link Google Sheet" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://docs.google.com/spreadsheets/d/…" />
      <Btn kind="ghost" label="Ambil dari Google Sheet" disabled={!link} onPress={ambilSheet} />
      {baris && (
        <Card>
          <T b>Pratinjau</T>
          <T c={C.primary}>{bagus.length} baris siap diimpor</T>
          {bermasalah.length > 0 && <T c={C.danger}>{bermasalah.length} baris bermasalah (dilewati)</T>}
          {bermasalah.slice(0, 8).map((b, i) => <T key={i} size={13} c={C.danger}>• {b.nama || "(tanpa nama)"} / {b.noRumah || "-"}: {b.masalah}</T>)}
          {bagus.slice(0, 5).map((b, i) => <T key={i} size={13} c={C.muted}>{b.nama} · {b.noRumah} · {b.noWa}</T>)}
          {bagus.length > 5 && <T size={13} c={C.muted}>…dan {bagus.length - 5} lainnya</T>}
        </Card>
      )}
      {baris && <Btn label={`Impor ${bagus.length} warga`} loading={sibuk} disabled={bagus.length === 0} onPress={async () => {
        setSibuk(true);
        const res = await jalankan(() => impor({ baris: bagus.map(({ masalah, ...b }) => b) }));
        setSibuk(false);
        if (res) Alert.alert("Selesai", `${res.ditambah} ditambah, ${res.diperbarui} diperbarui.`, [{ text: "OK", onPress: () => r.back() }]);
      }} />}
    </Screen>
  );
}
