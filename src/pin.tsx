import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { C } from "./ui";

const UKURAN = 76;  // diameter tombol
const JARAK = 16;   // jarak antar tombol (tetap, jadi tata letaknya selalu 3 kolom rapi di semua ukuran layar)

function Titik({ isi, salah }: { isi: boolean; salah: boolean }) {
  const s = useSharedValue(isi ? 1 : 0);
  useEffect(() => { s.set(isi ? withSpring(1, { damping: 11, stiffness: 220 }) : withTiming(0, { duration: 120 })); }, [isi]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.55 + s.get() * 0.45 }], opacity: 0.35 + s.get() * 0.65 }));
  const warna = salah ? C.danger : C.primary;
  return <Animated.View style={[{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: warna, backgroundColor: isi ? warna : "rgba(255,255,255,0.6)" }, st]} />;
}

// Titik-titik PIN, bergoyang saat PIN salah
export function PinDots({ panjang, error }: { panjang: number; error?: string }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (error) x.set(withSequence(withTiming(-10, { duration: 55 }), withTiming(10, { duration: 90 }), withTiming(-8, { duration: 90 }), withTiming(8, { duration: 90 }), withTiming(0, { duration: 55 })));
  }, [error]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", justifyContent: "center", gap: 16, paddingVertical: 6 }, st]}>
      {[0, 1, 2, 3, 4, 5].map((i) => <Titik key={i} isi={i < panjang} salah={!!error} />)}
    </Animated.View>
  );
}

function Tombol({ onPress, children, kosong }: { onPress?: () => void; children?: React.ReactNode; kosong?: boolean }) {
  if (kosong) return <View style={{ width: UKURAN, height: UKURAN }} />;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: UKURAN, height: UKURAN, borderRadius: UKURAN / 2, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? C.primarySoft : C.card, borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", transform: [{ scale: pressed ? 0.93 : 1 }] })}>
      {children}
    </Pressable>
  );
}

const BARIS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]];

// Papan angka PIN: 3 kolom x 4 baris, tombol bulat berukuran tetap.
export function PinPad({ value, onChange, onComplete, onBio, bio, busy }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; onBio?: () => void; bio?: boolean; busy?: boolean;
}) {
  const tekan = (d: string) => {
    if (busy || value.length >= 6) return;
    const baru = value + d;
    onChange(baru);
    if (baru.length === 6) onComplete?.(baru);
  };
  const angka = (d: string) => (
    <Tombol key={d} onPress={() => tekan(d)}>
      <Text style={{ fontSize: 30, color: C.ink, fontWeight: "500", fontVariant: ["tabular-nums"] }}>{d}</Text>
    </Tombol>
  );
  return (
    <View style={{ alignSelf: "center", gap: JARAK, opacity: busy ? 0.6 : 1 }}>
      {BARIS.map((b, i) => <View key={i} style={{ flexDirection: "row", gap: JARAK }}>{b.map(angka)}</View>)}
      <View style={{ flexDirection: "row", gap: JARAK }}>
        {bio ? <Tombol onPress={onBio}><Ionicons name="finger-print" size={32} color={C.primary} /></Tombol> : <Tombol kosong />}
        {angka("0")}
        <Tombol onPress={() => !busy && onChange(value.slice(0, -1))}><Ionicons name="backspace-outline" size={28} color={C.ink} /></Tombol>
      </View>
    </View>
  );
}
