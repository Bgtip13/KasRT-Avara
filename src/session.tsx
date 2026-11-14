import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuth from "expo-local-authentication";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { normWa } from "./util";

type Status = "memuat" | "keluar" | "terkunci" | "masuk";
type Info = { phone?: string; token?: string; nama?: string; role?: "admin" | "petugas" | "pengawas"; wajibGanti?: boolean };

const K_PHONE = "kas_phone", K_KEY = "kas_devkey", K_BIO = "kas_bio";

type Ctx = {
  status: Status; phone?: string; token?: string; bioAktif: boolean;
  user?: { nama: string; role: "admin" | "petugas" | "pengawas"; phone?: string; wajibGanti: boolean };
  pakaiNomor: (phone: string) => Promise<void>;
  masukPin: (pin: string) => Promise<string | null>;
  masukBio: () => Promise<string | null>;
  aktifkanBio: (token?: string) => Promise<string | null>;
  matikanBio: () => Promise<void>;
  keluar: () => Promise<void>;
  lupaAkun: () => Promise<void>;
};
const SesiCtx = createContext<Ctx>(null as any);
export const useSesi = () => useContext(SesiCtx);

export function SesiProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("memuat");
  const [info, setInfo] = useState<Info>({});
  const [bioAktif, setBioAktif] = useState(false);
  const loginPin = useMutation(api.auth.loginPin);
  const loginPerangkat = useMutation(api.auth.loginPerangkat);
  const aktifkanBiometrik = useMutation(api.auth.aktifkanBiometrik);
  const matikanBiometrik = useMutation(api.auth.matikanBiometrik);
  const keluarServer = useMutation(api.auth.keluar);
  const saya = useQuery(api.auth.saya, info.token ? { token: info.token } : "skip");

  useEffect(() => {
    (async () => {
      const phone = await SecureStore.getItemAsync(K_PHONE);
      setBioAktif((await SecureStore.getItemAsync(K_BIO)) === "1");
      setInfo({ phone: phone ?? undefined });
      setStatus(phone ? "terkunci" : "keluar");
    })();
  }, []);

  // Sesi dicabut/kedaluwarsa di server -> kunci lagi
  useEffect(() => {
    if (status === "masuk" && saya === null) { setInfo((x) => ({ phone: x.phone })); setStatus("terkunci"); }
  }, [saya, status]);

  const sukses = (r: any) => { setInfo((x) => ({ ...x, token: r.token, nama: r.nama, role: r.role, wajibGanti: r.wajibGanti })); setStatus("masuk"); };

  const value: Ctx = {
    status, phone: info.phone, token: info.token, bioAktif,
    user: info.token ? { nama: saya?.nama ?? info.nama ?? "", role: (saya?.role ?? info.role) as any, phone: info.phone, wajibGanti: saya?.wajibGanti ?? info.wajibGanti ?? false } : undefined,
    pakaiNomor: async (phone) => {
      const p = normWa(phone);
      await SecureStore.setItemAsync(K_PHONE, p);
      setInfo({ phone: p }); setStatus("terkunci");
    },
    masukPin: async (pin) => {
      const r = await loginPin({ phone: info.phone!, pin });
      if (r.ok) { sukses(r); return null; }
      return r.pesan;
    },
    masukBio: async () => {
      try {
        const key = await SecureStore.getItemAsync(K_KEY, { requireAuthentication: true, authenticationPrompt: "Masuk ke Kas RT" });
        if (!key) return "Biometrik belum diaktifkan";
        const r = await loginPerangkat({ phone: info.phone!, deviceKey: key });
        if (r.ok) { sukses(r); return null; }
        return r.pesan;
      } catch { return "Biometrik dibatalkan. Masukkan PIN."; }
    },
    aktifkanBio: async (tokenArg) => {
      const token = tokenArg ?? info.token;
      if (!token) return "Belum masuk";
      if (!(await LocalAuth.hasHardwareAsync()) || !(await LocalAuth.isEnrolledAsync()))
        return "HP ini belum punya sidik jari/wajah yang terdaftar. Atur dulu di Pengaturan HP.";
      const ok = await LocalAuth.authenticateAsync({ promptMessage: "Konfirmasi untuk mengaktifkan biometrik" });
      if (!ok.success) return "Dibatalkan";
      const key = await aktifkanBiometrik({ token });
      await SecureStore.setItemAsync(K_KEY, key, { requireAuthentication: true });
      await SecureStore.setItemAsync(K_BIO, "1");
      setBioAktif(true);
      return null;
    },
    matikanBio: async () => {
      if (info.token) await matikanBiometrik({ token: info.token });
      await SecureStore.deleteItemAsync(K_KEY);
      await SecureStore.deleteItemAsync(K_BIO);
      setBioAktif(false);
    },
    keluar: async () => {
      if (info.token) { try { await keluarServer({ token: info.token }); } catch {} }
      setInfo((x) => ({ phone: x.phone })); setStatus("terkunci");
    },
    lupaAkun: async () => {
      await SecureStore.deleteItemAsync(K_PHONE); await SecureStore.deleteItemAsync(K_KEY); await SecureStore.deleteItemAsync(K_BIO);
      setBioAktif(false); setInfo({}); setStatus("keluar");
    },
  };
  return <SesiCtx.Provider value={value}>{children}</SesiCtx.Provider>;
}

// Helper query/mutation yang otomatis menyertakan token
export function useQ(fn: any, args: any = {}): any {
  const { token } = useSesi();
  return (useQuery as any)(fn, token ? { token, ...args } : "skip");
}
export function useM(fn: any): (args?: any) => Promise<any> {
  const { token } = useSesi();
  const m = useMutation(fn) as any;
  return (args: any = {}) => m({ token, ...args });
}
