import { useQ } from "../src/session";
import { api } from "../convex/_generated/api";
import { Screen, T, Card, Tunggu, C } from "../src/ui";

export default function Log() {
  const l = useQ(api.log.daftar);
  return (
    <Screen>
      {!l ? <Tunggu /> : l.map((x: any) => (
        <Card key={x._id}>
          <T b size={14}>{x.aksi}</T>
          <T size={13}>{x.detail}</T>
          <T size={12} c={C.muted}>{x.nama} · {new Date(x._creationTime).toLocaleString("id-ID")}</T>
        </Card>
      ))}
    </Screen>
  );
}
