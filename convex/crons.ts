import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// 01:00 WIB tiap hari: acara yang kemarin (H+1) diproses -> tagihan + antrean pengingat
crons.daily("proses tagihan H+1", { hourUTC: 18, minuteUTC: 0 }, internal.event.prosesOtomatis);
// Tanggal 1 tiap bulan 00:30 WIB: buat tagihan bulanan semua warga
crons.monthly("tagihan bulanan", { day: 1, hourUTC: 17, minuteUTC: 30 }, internal.event.generateBulanan);
export default crons;
