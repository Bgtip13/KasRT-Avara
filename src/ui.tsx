import { ReactNode, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Modal, Platform, StyleSheet,
  useWindowDimensions, TextInputProps, ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConvexError } from "convex/values";

// Palet biru (selaras logo NB Projects: biru listrik, cyan, sentuhan ungu). Tanpa aksen hijau.
export const C = {
  bg: "#F3F6FC",
  card: "#FFFFFF",
  solid: "#FFFFFF",
  primary: "#2563EB", primaryDark: "#1D4ED8", primarySoft: "#E3ECFF",
  accent: "#06B6D4", violet: "#7C5CFC",
  ink: "#0F1B3D", muted: "#5F6F92",
  line: "#E1E7F2", glass: "rgba(255,255,255,0.92)",
  danger: "#DC2626", dangerSoft: "#FEE2E2",
  warn: "#B45309", warnSoft: "#FEF3C7",
};

export type IconName = keyof typeof Ionicons.glyphMap;
const ios = Platform.OS === "ios";
// Bayangan halus: kartu tampak "terangkat" tanpa ramai
const SOFT: ViewStyle = ios ? { shadowColor: "#1E3A8A", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } } : { elevation: 1 };

/* ------------------------------------------------------------------ Latar */

// Lingkaran konsentris bertransparansi rendah sebagai aproksimasi gradasi radial (dipakai juga oleh splash)
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

// Latar statis dan tenang (tanpa animasi) supaya konten yang menonjol
export function Background() {
  const { width: W } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Orb size={W * 0.9} color="#3B82F6" peak={0.12} layers={10} style={{ top: -W * 0.45, right: -W * 0.35 }} />
      <Orb size={W * 0.8} color="#8B5CF6" peak={0.07} layers={10} style={{ bottom: -W * 0.4, left: -W * 0.35 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ Layar & teks */

export const TAB_PAD = 24; // tab bar menempel di bawah, jadi cukup sedikit ruang
export function useTabPad() { return TAB_PAD; }

export function Screen({ children, scroll = true, tab, plain, title, sub }: {
  children: ReactNode; scroll?: boolean;
  tab?: boolean;    // layar di dalam tab (judul sendiri)
  plain?: boolean;  // tanpa header sistem (login, PIN baru)
  title?: string; sub?: string; edges?: any;
}) {
  const ins = useSafeAreaInsets();
  const top = tab ? ins.top + 14 : plain ? ins.top + 20 : 14;
  const bottom = tab ? TAB_PAD : ins.bottom + 32;
  const head = title ? (
    <View style={{ marginBottom: 2, gap: 2 }}>
      <T size={26} b s={{ letterSpacing: -0.4 }}>{title}</T>
      {!!sub && <T c={C.muted} size={14}>{sub}</T>}
    </View>
  ) : null;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Background />
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: top, paddingBottom: bottom, gap: 12 }}>
          {head}{children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: top, paddingBottom: tab ? 0 : bottom, gap: 12 }}>{head}{children}</View>
      )}
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

/* ------------------------------------------------------------------ Kartu */

export const Card = ({ children, s, onPress }: { children: ReactNode; s?: ViewStyle; onPress?: () => void }) => {
  const st: ViewStyle = { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 4, borderWidth: 1, borderColor: C.line, ...SOFT, ...s };
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.88 }]}>{children}</Pressable>
    : <View style={st}>{children}</View>;
};

// Kartu utama berwarna biru
export const Hero = ({ children, s }: { children: ReactNode; s?: ViewStyle }) => (
  <View style={{ backgroundColor: C.primaryDark, borderRadius: 24, padding: 20, gap: 4, overflow: "hidden", ...(ios ? { shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } } : { elevation: 3 }), ...s }}>
    <View pointerEvents="none" style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "#22D3EE", opacity: 0.24, top: -110, right: -70 }} />
    <View pointerEvents="none" style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "#8B5CF6", opacity: 0.34, bottom: -120, left: -60 }} />
    {children}
  </View>
);

export function Badge({ label, tone = "info" }: { label: string; tone?: "info" | "danger" | "muted" | "warn" }) {
  const bg = tone === "danger" ? C.dangerSoft : tone === "muted" ? "rgba(95,111,146,0.14)" : tone === "warn" ? C.warnSoft : C.primarySoft;
  const fg = tone === "danger" ? C.danger : tone === "muted" ? C.muted : tone === "warn" ? C.warn : C.primaryDark;
  return <View style={{ alignSelf: "flex-start", backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}><Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text></View>;
}

// Baris "label ........ nilai" untuk rincian
export const Info = ({ label, value, b }: { label: string; value: ReactNode; b?: boolean }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
    <T size={13} c={C.muted}>{label}</T>
    <T size={13} b={b} s={{ flexShrink: 1, textAlign: "right" }}>{value}</T>
  </View>
);

/* ------------------------------------------------------------------ Tombol, isian, chip */

export function Btn({ label, onPress, kind = "primary", disabled, loading, s, icon, small }: {
  label: string; onPress: () => void; kind?: "primary" | "ghost" | "danger" | "soft"; disabled?: boolean; loading?: boolean; s?: ViewStyle; icon?: IconName; small?: boolean;
}) {
  const bg = kind === "primary" ? C.primary : kind === "danger" ? C.danger : kind === "soft" ? C.primarySoft : C.solid;
  const fg = kind === "ghost" || kind === "soft" ? C.primaryDark : "#fff";
  const glow: ViewStyle = kind === "primary" || kind === "danger" ? (ios ? { shadowColor: kind === "danger" ? C.danger : C.primary, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } } : { elevation: 2 }) : {};
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 14, paddingVertical: small ? 9 : 13, paddingHorizontal: small ? 12 : 18, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.88 : 1, borderWidth: kind === "ghost" ? 1.5 : 0, borderColor: "rgba(37,99,235,0.3)" }, glow, s]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          {!!icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 13 : 15 }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, ...p }: { label: string } & TextInputProps) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600", marginLeft: 2 }}>{label}</Text>}
      <TextInput placeholderTextColor="#98A5C3" {...p}
        onFocus={(e) => { setFokus(true); p.onFocus?.(e); }}
        onBlur={(e) => { setFokus(false); p.onBlur?.(e); }}
        style={[{ backgroundColor: C.solid, borderWidth: fokus ? 1.5 : 1, borderColor: fokus ? C.primary : C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink }, p.multiline ? { minHeight: 110, textAlignVertical: "top" } : null, p.style]} />
    </View>
  );
}

// Kolom pencarian satu baris: ikon kaca pembesar + tombol hapus. Tanpa label supaya tidak menumpuk dengan elemen lain.
export function SearchBar({ value, onChangeText, placeholder = "Cari…", s, autoFocus }: { value: string; onChangeText: (t: string) => void; placeholder?: string; s?: ViewStyle; autoFocus?: boolean }) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: C.solid, borderRadius: 14, borderWidth: fokus ? 1.5 : 1, borderColor: fokus ? C.primary : C.line, paddingHorizontal: 12, height: 46, gap: 8 }, s]}>
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A5C3" autoFocus={autoFocus}
        onFocus={() => setFokus(true)} onBlur={() => setFokus(false)} returnKeyType="search" autoCorrect={false} autoCapitalize="none"
        style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }} />
      {value.length > 0 && <Pressable onPress={() => onChangeText("")} hitSlop={10}><Ionicons name="close-circle" size={18} color="#98A5C3" /></Pressable>}
    </View>
  );
}

// Hasil pencarian dalam satu kotak berbaris (bukan kartu-kartu bertumpuk)
export function PilihList({ items, onPick, kosong }: { items: { key: string; judul: string; sub?: string }[]; onPick: (key: string) => void; kosong?: string }) {
  return (
    <View style={{ backgroundColor: C.solid, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: "hidden" }}>
      {items.length === 0 && !!kosong && <Text style={{ color: C.muted, fontSize: 13, padding: 14 }}>{kosong}</Text>}
      {items.map((x, i) => (
        <Pressable key={x.key} onPress={() => onPick(x.key)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pressed ? C.primarySoft : C.solid, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line })}>
          <Avatar nama={x.judul} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: "600", fontSize: 15 }}>{x.judul}</Text>
            {!!x.sub && <Text style={{ color: C.muted, fontSize: 12 }}>{x.sub}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.muted} />
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, aktif, onPress }: { label: string; aktif?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: aktif ? C.primary : C.solid, borderWidth: 1, borderColor: aktif ? C.primary : C.line, opacity: pressed ? 0.85 : 1 })}>
      <Text style={{ color: aktif ? "#fff" : C.ink, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
export const Chips = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
export const Kosong = ({ teks, ikon = "file-tray-outline" }: { teks: string; ikon?: IconName }) => (
  <View style={{ alignItems: "center", gap: 10, paddingVertical: 32, paddingHorizontal: 16 }}>
    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={ikon} size={26} color={C.primaryDark} /></View>
    <Text style={{ color: C.muted, textAlign: "center", lineHeight: 21 }}>{teks}</Text>
  </View>
);
export const Tunggu = () => <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;

/* ------------------------------------------------------------------ Aksi pada catatan (Edit / Cetak / Hapus) */

export type AksiItem = { label: string; icon: IconName; onPress: () => void; tone?: "danger"; hide?: boolean };
export function AksiBar({ items }: { items: AksiItem[] }) {
  const tampil = items.filter((x) => !x.hide);
  if (tampil.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", marginTop: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 4 }}>
      {tampil.map((x, i) => {
        const warna = x.tone === "danger" ? C.danger : C.primaryDark;
        return (
          <Pressable key={i} onPress={x.onPress} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: pressed ? C.primarySoft : "transparent" })}>
            <Ionicons name={x.icon} size={16} color={warna} />
            <Text style={{ color: warna, fontWeight: "600", fontSize: 13 }}>{x.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type SheetItem = { label: string; ket?: string; icon?: IconName; tone?: "danger"; onPress: () => void };
// Menu pilihan dari bawah layar (tidak dibatasi 3 tombol seperti Alert di Android)
export function Sheet({ tampil, judul, sub, items, onTutup }: { tampil: boolean; judul?: string; sub?: string; items: SheetItem[]; onTutup: () => void }) {
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={tampil} transparent animationType="fade" onRequestClose={onTutup} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={onTutup} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15,27,61,0.45)" }]} />
        <View style={{ backgroundColor: C.solid, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 16, paddingBottom: ins.bottom + 16, gap: 2 }}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 10 }} />
          {!!judul && <T b size={17}>{judul}</T>}
          {!!sub && <T size={13} c={C.muted}>{sub}</T>}
          <View style={{ height: 6 }} />
          {items.map((it, i) => {
            const warna = it.tone === "danger" ? C.danger : C.ink;
            return (
              <Pressable key={i} onPress={() => { onTutup(); setTimeout(it.onPress, 300); }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, backgroundColor: pressed ? C.primarySoft : "transparent" })}>
                {!!it.icon && <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: it.tone === "danger" ? C.dangerSoft : C.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={it.icon} size={19} color={it.tone === "danger" ? C.danger : C.primaryDark} /></View>}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: warna, fontWeight: "600", fontSize: 15 }}>{it.label}</Text>
                  {!!it.ket && <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{it.ket}</Text>}
                </View>
              </Pressable>
            );
          })}
          <Btn kind="ghost" label="Tutup" onPress={onTutup} s={{ marginTop: 8 }} />
        </View>
      </View>
    </Modal>
  );
}

// Dialog konfirmasi dua tombol
export function konfirmasi(judul: string, pesan: string | undefined, labelOk: string, onOk: () => void, bahaya = true) {
  Alert.alert(judul, pesan, [{ text: "Batal", style: "cancel" }, { text: labelOk, style: bahaya ? "destructive" : "default", onPress: onOk }]);
}

/* ------------------------------------------------------------------ Util */

export function pesanError(e: any) {
  if (e instanceof ConvexError) return String(e.data);
  return "Terjadi kesalahan. Periksa koneksi internet lalu coba lagi.";
}
export async function jalankan<R>(fn: () => Promise<R>): Promise<R | undefined> {
  try { return await fn(); } catch (e) { Alert.alert("Gagal", pesanError(e)); }
}

function ModalKotak({ tampil, onBatal, children }: { tampil: boolean; onBatal: () => void; children: ReactNode }) {
  return (
    <Modal visible={tampil} transparent animationType="fade" onRequestClose={onBatal}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,27,61,0.5)", justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: C.solid, borderRadius: 24, padding: 20, gap: 14 }}>{children}</View>
      </View>
    </Modal>
  );
}

export function AlasanModal({ tampil, judul, onBatal, onOk, labelOk = "Batalkan data", label = "Alasan (tercatat di log)" }: { tampil: boolean; judul: string; onBatal: () => void; onOk: (alasan: string) => void; labelOk?: string; label?: string }) {
  const [a, setA] = useState("");
  return (
    <ModalKotak tampil={tampil} onBatal={onBatal}>
      <T b size={18}>{judul}</T>
      <Field label={label} value={a} onChangeText={setA} autoFocus />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn kind="ghost" label="Batal" onPress={() => { setA(""); onBatal(); }} s={{ flex: 1 }} />
        <Btn kind="danger" label={labelOk} disabled={!a.trim()} onPress={() => { const x = a; setA(""); onOk(x); }} s={{ flex: 1 }} />
      </View>
    </ModalKotak>
  );
}

// Isian satu baris (mis. ubah nama)
export function IsianModal({ tampil, judul, label, awal, labelOk = "Simpan", onBatal, onOk }: { tampil: boolean; judul: string; label: string; awal: string; labelOk?: string; onBatal: () => void; onOk: (nilai: string) => void }) {
  const [a, setA] = useState(awal);
  // Isi ulang nilai awal setiap kali modal dibuka (disesuaikan saat render, bukan lewat effect)
  const [tampilSblm, setTampilSblm] = useState(tampil);
  if (tampil !== tampilSblm) { setTampilSblm(tampil); if (tampil) setA(awal); }
  return (
    <ModalKotak tampil={tampil} onBatal={onBatal}>
      <T b size={18}>{judul}</T>
      <Field label={label} value={a} onChangeText={setA} autoFocus />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Btn kind="ghost" label="Batal" onPress={onBatal} s={{ flex: 1 }} />
        <Btn label={labelOk} disabled={!a.trim()} onPress={() => onOk(a.trim())} s={{ flex: 1 }} />
      </View>
    </ModalKotak>
  );
}

// Lingkaran inisial nama
export function Avatar({ nama, size = 42 }: { nama: string; size?: number }) {
  const huruf = (nama || "?").trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: C.primaryDark, fontWeight: "800", fontSize: size * 0.42 }}>{huruf}</Text>
    </View>
  );
}
