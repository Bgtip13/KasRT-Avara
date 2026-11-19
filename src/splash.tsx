import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import { C, Orb } from "./ui";

// Ukuran & latar HARUS sama dengan konfigurasi splash native di app.json (imageWidth 320 x logo 50% = 160),
// supaya peralihan dari splash native ke animasi ini tidak terlihat loncat.
export const BG_SPLASH = "#F5F8FF";
const LOGO = 160;
const GESER = 28;               // logo naik sedikit untuk memberi ruang ke wordmark
const MIN_MS = 2400;            // animasi diputar minimal selama ini
const EXIT_MS = 480;
const NAMA = "KasRT";

function Huruf({ ch, delay }: { ch: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }))); }, [delay, p]);
  const st = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * 18 }] }));
  return <Animated.Text style={[{ fontSize: 34, fontWeight: "800", color: C.ink, letterSpacing: -0.5 }, st]}>{ch}</Animated.Text>;
}

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const [minSelesai, setMinSelesai] = useState(false);
  const sudahPergi = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  const aurora = useSharedValue(0);   // 0 -> 1: aurora muncul
  const napas = useSharedValue(0);    // 0 <-> 1: aurora bernapas
  const skala = useSharedValue(1);    // logo "membal"
  const naik = useSharedValue(0);     // logo bergeser naik
  const cincin1 = useSharedValue(0);
  const cincin2 = useSharedValue(0);
  const kilau = useSharedValue(0);
  const sub = useSharedValue(0);
  const bar = useSharedValue(0);
  const keluar = useSharedValue(0);

  useEffect(() => {
    aurora.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    napas.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
    skala.set(withDelay(260, withSequence(withTiming(1.09, { duration: 280, easing: Easing.out(Easing.cubic) }), withSpring(1, { damping: 8, stiffness: 150 }))));
    naik.set(withDelay(700, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) })));
    cincin1.set(withDelay(300, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false)));
    cincin2.set(withDelay(1250, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false)));
    kilau.set(withDelay(950, withTiming(1, { duration: 950, easing: Easing.inOut(Easing.cubic) })));
    sub.set(withDelay(1350, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })));
    bar.set(withDelay(900, withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) }), -1, false)));
    const t = setTimeout(() => setMinSelesai(true), MIN_MS);
    return () => clearTimeout(t);
  }, [aurora, napas, skala, naik, cincin1, cincin2, kilau, sub, bar]);

  // Selesai bila animasi sudah cukup lama DAN sesi sudah dimuat
  useEffect(() => {
    if (!minSelesai || !ready || sudahPergi.current) return;
    sudahPergi.current = true;
    keluar.set(withTiming(1, { duration: EXIT_MS, easing: Easing.inOut(Easing.cubic) }));
    const t = setTimeout(() => onDoneRef.current(), EXIT_MS + 60);
    return () => clearTimeout(t);
  }, [minSelesai, ready, keluar]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - keluar.get(), transform: [{ scale: 1 + keluar.get() * 0.06 }] }));
  const aur = (dx: number, dy: number) => { "worklet"; return { opacity: aurora.get(), transform: [{ translateX: dx * (napas.get() - 0.5) }, { translateY: dy * (napas.get() - 0.5) }, { scale: 0.85 + aurora.get() * 0.15 + napas.get() * 0.06 }] }; };
  const aur1 = useAnimatedStyle(() => aur(60, -40));
  const aur2 = useAnimatedStyle(() => aur(-50, 50));
  const aur3 = useAnimatedStyle(() => aur(40, 36));
  const stage = useAnimatedStyle(() => ({ transform: [{ translateY: -GESER * naik.get() }, { scale: skala.get() * (1 + keluar.get() * 0.1) }] }));
  const ring = (p: number) => { "worklet"; return { opacity: (1 - p) * 0.5, transform: [{ scale: 1 + p * 1.6 }] }; };
  const r1 = useAnimatedStyle(() => ring(cincin1.get()));
  const r2 = useAnimatedStyle(() => ring(cincin2.get()));
  const kil = useAnimatedStyle(() => ({ transform: [{ translateX: -LOGO * 0.7 + kilau.get() * LOGO * 1.9 }, { rotate: "18deg" }] }));
  const subSt = useAnimatedStyle(() => ({ opacity: sub.get(), transform: [{ translateY: (1 - sub.get()) * 10 }] }));
  const barSt = useAnimatedStyle(() => ({ opacity: sub.get(), transform: [{ translateX: -50 + bar.get() * 150 }] }));

  return (
    <Animated.View
      onLayout={() => { SplashScreen.hideAsync().catch(() => {}); }}
      style={[StyleSheet.absoluteFill, { backgroundColor: BG_SPLASH, zIndex: 999 }, root]}>
      {/* aurora */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
        <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", top: -W * 0.35, right: -W * 0.45 }, aur1]}><Orb size={W * 1.15} color="#3B82F6" peak={0.34} /></Animated.View>
        <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", top: H * 0.5, left: -W * 0.6 }, aur2]}><Orb size={W * 1.1} color="#8B5CF6" peak={0.26} /></Animated.View>
        <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[{ position: "absolute", bottom: -W * 0.55, right: -W * 0.25 }, aur3]}><Orb size={W * 1.1} color="#22D3EE" peak={0.3} /></Animated.View>
      </View>

      {/* logo di tengah layar (sama persis dengan splash native), cincin & kilau di sekitarnya */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Animated.View style={[{ width: LOGO, height: LOGO }, stage]}>
          <Animated.View style={[{ position: "absolute", width: LOGO, height: LOGO, borderRadius: LOGO * 0.28, borderWidth: 2, borderColor: C.primary }, r1]} />
          <Animated.View style={[{ position: "absolute", width: LOGO, height: LOGO, borderRadius: LOGO * 0.28, borderWidth: 2, borderColor: C.accent }, r2]} />
          <Image source={require("../assets/images/logo-mark.png")} style={{ width: LOGO, height: LOGO }} resizeMode="contain" />
          <View style={{ position: "absolute", width: LOGO, height: LOGO, borderRadius: LOGO * 0.27, overflow: "hidden" }}>
            <Animated.View style={[{ position: "absolute", top: -LOGO * 0.3, left: LOGO / 2 - 40, width: 80, height: LOGO * 1.6, alignItems: "center", justifyContent: "center" }, kil]}>
              <View style={{ position: "absolute", width: 80, height: "100%", backgroundColor: "rgba(255,255,255,0.10)" }} />
              <View style={{ position: "absolute", width: 44, height: "100%", backgroundColor: "rgba(255,255,255,0.22)" }} />
              <View style={{ position: "absolute", width: 14, height: "100%", backgroundColor: "rgba(255,255,255,0.55)" }} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* wordmark di bawah logo */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <View style={{ alignItems: "center", transform: [{ translateY: LOGO / 2 + 38 }] }}>
          <View style={{ flexDirection: "row" }}>{NAMA.split("").map((ch, i) => <Huruf key={i} ch={ch} delay={900 + i * 70} />)}</View>
          <Animated.Text style={[{ color: C.primary, fontSize: 13, fontWeight: "700", letterSpacing: 5, marginTop: 2 }, subSt]}>AVARA D&amp;E</Animated.Text>
        </View>
      </View>

      {/* indikator muat */}
      <View pointerEvents="none" style={{ position: "absolute", bottom: Math.max(56, H * 0.09), alignSelf: "center", width: 100, height: 4, borderRadius: 2, backgroundColor: "rgba(37,99,235,0.14)", overflow: "hidden" }}>
        <Animated.View style={[{ width: 50, height: 4, borderRadius: 2, backgroundColor: C.primary }, barSt]} />
      </View>
    </Animated.View>
  );
}
