import { Component, ReactNode, useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SesiProvider, useSesi } from "../src/session";
import { AnimatedSplash } from "../src/splash";
import { Btn, C, pesanError } from "../src/ui";

// Splash native tetap tampil sampai animasi splash (JS) siap menggantikannya
SplashScreen.preventAutoHideAsync().catch(() => {});

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL || "https://hallowed-civet-434.convex.cloud", { unsavedChangesWarning: false });

function Gagal({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 28, gap: 14, backgroundColor: C.bg }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.ink }}>Ada yang tidak beres</Text>
      <Text style={{ color: C.muted, lineHeight: 21 }}>{pesanError(error)} Anda tidak perlu masuk lagi, cukup coba muat ulang layar ini.</Text>
      <Btn label="Muat ulang" onPress={retry} />
    </View>
  );
}

// Fallback terakhir milik expo-router. Karena ia MENGGANTI seluruh layout (termasuk SesiProvider), keadaan sesi di React hilang
// dan pengguna diminta PIN lagi. Itu penyebab bug "koneksi terputus, harus masukkan PIN lagi". Pelindung di bawah menangkap error
// lebih dulu, di dalam provider, sehingga fallback ini nyaris tak pernah terpakai.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return <Gagal error={error} retry={retry} />;
}

class Pelindung extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <Gagal error={this.state.error} retry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
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
    <Stack screenOptions={{
      headerTransparent: true, headerShadowVisible: false, headerTintColor: C.ink,
      headerTitleStyle: { fontWeight: "700" },
      ...(Platform.OS === "ios" ? { headerBlurEffect: "light" as const } : {}),
      contentStyle: { backgroundColor: C.bg },
    }}>
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
      <Stack.Screen name="pengguna" options={judul("Pengguna & peran")} />
      <Stack.Screen name="log" options={judul("Log aktivitas")} />
      <Stack.Screen name="pengaturan" options={judul("Pengaturan RT & template")} />
      <Stack.Screen name="keamanan" options={judul("Keamanan")} />
    </Stack>
  );
}

// Splash animasi tampil di atas semuanya; hilang setelah animasi cukup lama dan sesi selesai dimuat
function GerbangSplash() {
  const { status } = useSesi();
  const [tampil, setTampil] = useState(true);
  if (!tampil) return null;
  return <AnimatedSplash ready={status !== "memuat"} onDone={() => setTampil(false)} />;
}

export default function Root() {
  return (
    <ConvexProvider client={convex}>
      <SesiProvider>
        <StatusBar style="dark" />
        <Pelindung><Guard /></Pelindung>
        <GerbangSplash />
      </SesiProvider>
    </ConvexProvider>
  );
}
