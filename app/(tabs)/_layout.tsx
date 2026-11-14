import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../src/ui";

const ikon = (n: any) => ({ color, size }: any) => <Ionicons name={n} size={size} color={color} />;
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: C.primary, headerStyle: { backgroundColor: C.bg }, headerShadowVisible: false, tabBarStyle: { backgroundColor: C.card } }}>
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ikon("home-outline") }} />
      <Tabs.Screen name="warga" options={{ title: "Warga", tabBarIcon: ikon("people-outline") }} />
      <Tabs.Screen name="transaksi" options={{ title: "Transaksi", tabBarIcon: ikon("swap-vertical-outline") }} />
      <Tabs.Screen name="event" options={{ title: "Acara", tabBarIcon: ikon("calendar-outline") }} />
      <Tabs.Screen name="lainnya" options={{ title: "Lainnya", tabBarIcon: ikon("menu-outline") }} />
    </Tabs>
  );
}
