import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSesi } from "../../src/session";
import { C } from "../../src/ui";

const ikon = (aktif: any, mati: any) => {
  const IkonTab = ({ color, size, focused }: any) => <Ionicons name={focused ? aktif : mati} size={size} color={color} />;
  IkonTab.displayName = "IkonTab";
  return IkonTab;
};

export default function TabsLayout() {
  const ins = useSafeAreaInsets();
  const { user } = useSesi();
  const warga = user?.role === "warga";
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.primary, tabBarInactiveTintColor: "#8793B2",
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      // Tab bar menempel di bawah layar
      tabBarStyle: {
        backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: C.line,
        height: 58 + ins.bottom, paddingTop: 6, paddingBottom: ins.bottom > 0 ? ins.bottom - 2 : 8,
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
