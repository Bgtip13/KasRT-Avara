import { ReactNode, useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Modal, Platform, StyleSheet,
  useWindowDimensions, TextInputProps, ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ConvexError } from "convex/values";

// Palet biru (selaras logo NB Projects: biru listrik, cyan, sentuhan ungu). Tanpa aksen hijau.
export const C = {
  bg: "#EEF3FF",
  card: "rgba(255,255,255,0.74)",   // kaca: putih transparan
  solid: "#FFFFFF",
  primary: "#2563EB", primaryDark: "#1D4ED8", primarySoft: "#DCE8FF",
  accent: "#06B6D4", violet: "#7C5CFC",
  ink: "#0F1B3D", muted: "#5F6F92",
  line: "rgba(37,99,235,0.16)", glass: "rgba(255,255,255,0.92)",
  danger: "#DC2626", dangerSoft: "#FEE2E2",
};

const ios = Platform.OS === "ios";
// Bayangan lembut kebiruan (iOS). Android: tanpa elevation supaya kartu transparan tidak berbayang kotor.
const GLOW: ViewStyle = ios ? { shadowColor: "#1E3A8A", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } } : {};
const EDGE = ios ? C.glass : "rgba(37,99,235,0.12)";

/* ------------------------------------------------------------------ Latar "aurora" */

// Aproksimasi gradasi radial: lingkaran konsentris bertransparansi rendah (tanpa dependensi tambahan).
export function Orb({ size, color, peak = 0.3, layers = 14, style }: { size: number; color: string; peak?: number; layers?: number; style?: any }) {
  const per = peak / layers;
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      {Array.from({ length: layers }, (_, i) => {
        const s = size * (1 - i / layers);
        return <View key={i} style={{ position: "absolute", width: s, height: s, borderRadius: s / 2, backgroundColor: color, opacity: per, left: (size - s) / 2, top: (size - s) / 2 }} />;
      })}
    </View>
  );
}

export function Background() {
  const { width: W, height: H } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => { t.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true)); }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -26 + t.get() * 52 }, { translateY: 20 - t.get() * 40 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: 34 - t.get() * 68 }, { translateY: -16 + t.get() * 32 }] }));
  const c = useAnimatedStyle(() => ({ transform: [{ translateX: -20 + t.get() * 40 }, { translateY: -26 + t.get() * 52 }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", top: -W * 0.42, right: -W * 0.38 }, a]}><Orb size={W * 1.05} color="#3B82F6" peak={0.3} /></Animated.View>
      <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", top: H * 0.34, left: -W * 0.55 }, b]}><Orb size={W * 1.0} color="#8B5CF6" peak={0.2} /></Animated.View>
      <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", bottom: -W * 0.5, right: -W * 0.3 }, c]}><Orb size={W * 1.05} color="#22D3EE" peak={0.26} /></Animated.View>
    </View>
  );
}

/* ------------------------------------------------------------------ Layar & teks */

export const TAB_PAD = 112; // ruang untuk tab bar melayang
export function useTabPad() { return useSafeAreaInsets().bottom + TAB_PAD; }

export function Screen({ children, scroll = true, tab, plain, title, sub }: {
  children: ReactNode; scroll?: boolean;
  tab?: boolean;    // layar di dalam tab (header sendiri, ruang untuk tab bar)
  plain?: boolean;  // tanpa header sistem (login, PIN baru)
  title?: string; sub?: string; edges?: any;
}) {
  const ins = useSafeAreaInsets();
  const top = tab ? ins.top + 12 : plain ? ins.top + 20 : ins.top + 64;
  const bottom = tab ? ins.bottom + TAB_PAD : ins.bottom + 36;
  const head = title ? (
    <View style={{ marginBottom: 4, gap: 2 }}>
      <T size={30} b s={{ letterSpacing: -0.5 }}>{title}</T>
      {!!sub && <T c={C.muted}>{sub}</T>}
    </View>
  ) : null;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Background />
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: top, paddingBottom: bottom, gap: 12 }}>
          {head}{children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: top, paddingBottom: tab ? 0 : bottom, gap: 12 }}>{head}{children}</View>
      )}
      {/* Android: header transparan -> tirai kaca supaya judul tetap terbaca saat isi digulir */}
      {!tab && !plain && !ios && <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: ins.top + 56, backgroundColor: "rgba(238,243,255,0.94)" }} />}
    </View>
  );
}

export const T = ({ children, b, s, c, size }: { children?: ReactNode; b?: boolean; s?: any; c?: string; size?: number }) => (
  <Text style={[{ color: c ?? C.ink, fontSize: size ?? 15, fontWeight: b ? "700" : "400" }, s]}>{children}</Text>
);

// Judul bagian kecil
export const Judul = ({ children }: { children: ReactNode }) => (
  <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 8, marginLeft: 4 }}>{children}</Text>
);

/* ------------------------------------------------------------------ Kartu kaca */

export const Card = ({ children, s, onPress }: { children: ReactNode; s?: ViewStyle; onPress?: () => void }) => {
  const st: ViewStyle = { backgroundColor: C.card, borderRadius: 22, padding: 16, gap: 4, borderWidth: 1, borderColor: EDGE, ...GLOW, ...s };
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>{children}</Pressable>
    : <View style={st}>{children}</View>;
};

// Kartu utama berwarna biru dengan "cairan" transparan di dalamnya
export const Hero = ({ children, s }: { children: ReactNode; s?: ViewStyle }) => (
  <View style={{ backgroundColor: C.primaryDark, borderRadius: 28, padding: 20, gap: 4, overflow: "hidden", ...(ios ? { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } } : {}), ...s }}>
    <View pointerEvents="none" style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "#22D3EE", opacity: 0.28, top: -110, right: -70 }} />
    <View pointerEvents="none" style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "#8B5CF6", opacity: 0.38, bottom: -120, left: -60 }} />
    <View pointerEvents="none" style={{ position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFFFFF", opacity: 0.1, top: 20, right: 70 }} />
    {children}
  </View>
);

export function Badge({ label, tone = "info" }: { label: string; tone?: "info" | "danger" | "muted" }) {
  const bg = tone === "danger" ? C.dangerSoft : tone === "muted" ? "rgba(95,111,146,0.14)" : C.primarySoft;
  const fg = tone === "danger" ? C.danger : tone === "muted" ? C.muted : C.primaryDark;
  return <View style={{ alignSelf: "flex-start", backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}><Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text></View>;
}

/* ------------------------------------------------------------------ Tombol, isian, chip */

export function Btn({ label, onPress, kind = "primary", disabled, loading, s }: { label: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; loading?: boolean; s?: ViewStyle }) {
  const bg = kind === "primary" ? C.primary : kind === "danger" ? C.danger : "rgba(255,255,255,0.6)";
  const fg = kind === "ghost" ? C.primaryDark : "#fff";
  const glow: ViewStyle = kind === "ghost" ? {} : ios ? { shadowColor: kind === "danger" ? C.danger : C.primary, shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } } : { elevation: 2 };
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.88 : 1, borderWidth: kind === "ghost" ? 1.5 : 0, borderColor: "rgba(37,99,235,0.35)", transform: [{ scale: pressed ? 0.985 : 1 }] }, glow, s]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...p }: { label: string } & TextInputProps) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600", marginLeft: 2 }}>{label}</Text>
      <TextInput placeholderTextColor="#98A5C3" {...p}
        onFocus={(e) => { setFokus(true); p.onFocus?.(e); }}
        onBlur={(e) => { setFokus(false); p.onBlur?.(e); }}
        style={[{ backgroundColor: "rgba(255,255,255,0.8)", borderWidth: fokus ? 1.5 : 1, borderColor: fokus ? C.primary : "rgba(37,99,235,0.16)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink }, p.multiline ? { minHeight: 110, textAlignVertical: "top" } : null, p.style]} />
    </View>
  );
}

export function Chip({ label, aktif, onPress }: { label: string; aktif?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 9, paddingHorizontal: 15, borderRadius: 22, backgroundColor: aktif ? C.primary : "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: aktif ? C.primary : "rgba(37,99,235,0.16)", opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ color: aktif ? "#fff" : C.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
export const Chips = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
export const Kosong = ({ teks }: { teks: string }) => <Text style={{ color: C.muted, textAlign: "center", paddingVertical: 28, paddingHorizontal: 12, lineHeight: 21 }}>{teks}</Text>;
export const Tunggu = () => <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

/* ------------------------------------------------------------------ Util */

export function pesanError(e: any) {
  if (e instanceof ConvexError) return String(e.data);
  return "Terjadi kesalahan. Periksa koneksi internet lalu coba lagi.";
}
export async function jalankan<R>(fn: () => Promise<R>): Promise<R | undefined> {
  try { return await fn(); } catch (e) { Alert.alert("Gagal", pesanError(e)); }
}

export function AlasanModal({ tampil, judul, onBatal, onOk }: { tampil: boolean; judul: string; onBatal: () => void; onOk: (alasan: string) => void }) {
  const [a, setA] = useState("");
  return (
    <Modal visible={tampil} transparent animationType="fade" onRequestClose={onBatal}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,27,61,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: C.solid, borderRadius: 26, padding: 20, gap: 14 }}>
          <T b size={18}>{judul}</T>
          <Field label="Alasan (tercatat di log)" value={a} onChangeText={setA} autoFocus />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn kind="ghost" label="Batal" onPress={() => { setA(""); onBatal(); }} s={{ flex: 1 }} />
            <Btn kind="danger" label="Batalkan data" disabled={!a.trim()} onPress={() => { const x = a; setA(""); onOk(x); }} s={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Lingkaran inisial nama
export function Avatar({ nama, size = 42 }: { nama: string; size?: number }) {
  const huruf = (nama || "?").trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" }}>
      <Text style={{ color: C.primaryDark, fontWeight: "800", fontSize: size * 0.42 }}>{huruf}</Text>
    </View>
  );
}
