import { ReactNode, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Modal, TextInputProps, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConvexError } from "convex/values";

export const C = {
  bg: "#EAF0EC", card: "#FFFFFF", primary: "#0F5C4A", primarySoft: "#D5E6DE", accent: "#D99A00",
  ink: "#14221D", muted: "#627068", line: "#D3DDD7", danger: "#B0372E",
};

export function Screen({ children, scroll = true, edges }: { children: ReactNode; scroll?: boolean; edges?: any }) {
  return (
    <SafeAreaView edges={edges ?? ["bottom"]} style={{ flex: 1, backgroundColor: C.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export const T = ({ children, b, s, c, size }: { children?: ReactNode; b?: boolean; s?: any; c?: string; size?: number }) => (
  <Text style={[{ color: c ?? C.ink, fontSize: size ?? 15, fontWeight: b ? "700" : "400" }, s]}>{children}</Text>
);

export const Card = ({ children, s, onPress }: { children: ReactNode; s?: ViewStyle; onPress?: () => void }) => {
  const st: ViewStyle = { backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: C.line, ...s };
  return onPress ? <Pressable onPress={onPress} style={st}>{children}</Pressable> : <View style={st}>{children}</View>;
};

export function Btn({ label, onPress, kind = "primary", disabled, loading, s }: { label: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; loading?: boolean; s?: ViewStyle }) {
  const bg = kind === "primary" ? C.primary : kind === "danger" ? C.danger : "transparent";
  const fg = kind === "ghost" ? C.primary : "#fff";
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={[{ backgroundColor: bg, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: "center", opacity: disabled ? 0.45 : 1, borderWidth: kind === "ghost" ? 1.5 : 0, borderColor: C.primary }, s]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...p }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: C.muted, fontSize: 13 }}>{label}</Text>
      <TextInput placeholderTextColor="#9AA8A0" {...p}
        style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.ink }, p.multiline ? { minHeight: 110, textAlignVertical: "top" } : null, p.style]} />
    </View>
  );
}

export function Chip({ label, aktif, onPress }: { label: string; aktif?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: aktif ? C.primary : C.card, borderWidth: 1, borderColor: aktif ? C.primary : C.line }}>
      <Text style={{ color: aktif ? "#fff" : C.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
export const Chips = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
export const Kosong = ({ teks }: { teks: string }) => <Text style={{ color: C.muted, textAlign: "center", paddingVertical: 28 }}>{teks}</Text>;
export const Tunggu = () => <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

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
      <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, gap: 12 }}>
          <T b size={17}>{judul}</T>
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
