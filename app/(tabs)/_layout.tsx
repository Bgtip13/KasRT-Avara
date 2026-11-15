import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSesi } from "../../src/session";
import { C } from "../../src/ui";

const ikon = (aktif: any, mati: any) => ({ color, size, focused }: any) => <Ionicons name={focused ? aktif : mati} size={size} color={color} />;

export default function TabsLayout() {
  const ins = useSafeAreaInsets();
  const { user } = useSesi();
  const warga = user?.role === "warga";
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: "#8793B2",
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      // Tab bar kaca melayang
      tabBarStyle: {
        position: "absolute", left: 16, right: 16, bottom: ins.bottom + 10, height: 66, borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.9)", borderTopWidth: 0, borderWidth: 1, borderColor: "rgba(255,255,255,0.95)",
        paddingTop: 8, paddingBottom: 8,
        ...(Platform.OS === "ios" ? { shadowColor: "#1E3A8A", shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } } : { elevation: 8 }),
      },
    }}>
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ikon("home", "home-outline") }} />
      <Tabs.Screen name="warga" options={{ title: "Warga", tabBarIcon: ikon("people", "people-outline"), href: warga ? null : undefined }} />
      <Tabs.Screen name="transaksi" options={{ title: warga ? "Riwayat" : "Transaksi", tabBarIcon: ikon("swap-vertical", "swap-vertical-outline") }} />
      <Tabs.Screen name="event" options={{ title: "Acara", tabBarIcon: ikon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="lainnya" options={{ title: warga ? "Akun" : "Lainnya", tabBarIcon: ikon("grid", "grid-outline") }} />
    </Tabs>
  );
}
