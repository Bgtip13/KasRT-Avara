import { useRouter } from "expo-router";
import { useQ } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Btn, Tunggu, C } from "../src/ui";
import { rp } from "../src/util";

const NAMA_PERIODE: any = { bulanan: "per bulan", sekali: "sekali bayar", bebas: "bebas / sukarela" };
export default function Kas() {
  const r = useRouter();
  const kas = useQ(api.kas.daftar);
  return (
    <Screen>
      <Btn label="+ Tambah jenis kas" onPress={() => r.push("/kas-form")} />
      {!kas ? <Tunggu /> : kas.map((k: any) => (
        <Card key={k._id} onPress={() => r.push({ pathname: "/kas-form", params: { id: k._id } })} s={{ opacity: k.aktif ? 1 : 0.5 }}>
          <T b>{k.nama}{k.aktif ? "" : " (nonaktif)"}</T>
          <T size={13}>{k.periode === "bebas" ? NAMA_PERIODE.bebas : `${rp(k.nominal)} ${NAMA_PERIODE[k.periode]}`}{k.nominalKontrak != null ? ` · kontrak ${rp(k.nominalKontrak)}` : ""}</T>
          <T size={13} c={C.muted}>Saldo {rp(k.saldo)} · Petugas: {k.namaPetugas.join(", ") || "belum ada"}</T>
        </Card>
      ))}
    </Screen>
  );
}
