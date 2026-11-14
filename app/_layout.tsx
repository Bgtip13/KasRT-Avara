import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { View, Text, Pressable } from "react-native";
import { SesiProvider, useSesi } from "../src/session";
import { C } from "../src/ui";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL || "https://hallowed-civet-434.convex.cloud", { unsavedChangesWarning: false });

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: C.bg }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: C.ink }}>Ada yang tidak beres</Text>
      <Text style={{ color: C.muted }}>Sesi mungkin berakhir atau koneksi terputus. Coba lagi, atau tutup dan buka ulang aplikasi.</Text>
      <Pressable onPress={retry} style={{ backgroundColor: C.primary, padding: 14, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>Coba lagi</Text>
      </Pressable>
    </View>
  );
}

function Guard() {
  const s = useSesi();
  const seg = useSegments();
  const r = useRouter();
  useEffect(() => {
    if (s.status === "memuat") return;
    const diLogin = seg[0] === "login";
    const diPinBaru = seg[0] === "pin-baru";
    if (s.status !== "masuk") { if (!diLogin) r.replace("/login"); return; }
    if (s.user?.wajibGanti) { if (!diPinBaru) r.replace("/pin-baru"); return; }
    if (diLogin || diPinBaru) r.replace("/");
  }, [s.status, s.user?.wajibGanti, seg]);

  const judul = (title: string) => ({ title });
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.ink, headerShadowVisible: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="pin-baru" options={{ headerShown: false }} />
      <Stack.Screen name="warga-form" options={judul("Data warga")} />
      <Stack.Screen name="warga-impor" options={judul("Impor data warga")} />
      <Stack.Screen name="bayar" options={judul("Catat pembayaran")} />
      <Stack.Screen name="pengeluaran-form" options={judul("Catat pengeluaran")} />
      <Stack.Screen name="kas" options={judul("Jenis kas")} />
      <Stack.Screen name="kas-form" options={judul("Pengaturan kas")} />
      <Stack.Screen name="event-form" options={judul("Acara")} />
      <Stack.Screen name="event/[id]" options={judul("Detail acara")} />
      <Stack.Screen name="blast" options={judul("Kirim lewat WhatsApp")} />
      <Stack.Screen name="laporan" options={judul("Laporan")} />
      <Stack.Screen name="pengguna" options={judul("Petugas & pengguna")} />
      <Stack.Screen name="log" options={judul("Log aktivitas")} />
      <Stack.Screen name="pengaturan" options={judul("Pengaturan RT & template")} />
      <Stack.Screen name="keamanan" options={judul("Keamanan")} />
    </Stack>
  );
}

export default function Root() {
  return (
    <ConvexProvider client={convex}>
      <SesiProvider>
        <StatusBar style="dark" />
        <Guard />
      </SesiProvider>
    </ConvexProvider>
  );
}
