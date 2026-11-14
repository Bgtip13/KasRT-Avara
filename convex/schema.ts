import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("petugas"), v.literal("pengawas"));
const periode = v.union(v.literal("bulanan"), v.literal("sekali"), v.literal("bebas"));

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    nama: v.string(),
    role,
    aktif: v.boolean(),
    pinHash: v.string(),
    pinSalt: v.string(),
    wajibGanti: v.boolean(), // true = masih PIN awal dari admin, wajib diganti saat masuk
    gagal: v.optional(v.number()),
    terkunciSampai: v.optional(v.number()),
  }).index("by_phone", ["phone"]),

  sessions: defineTable({ userId: v.id("users"), token: v.string(), expiresAt: v.number() })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  devices: defineTable({ userId: v.id("users"), keyHash: v.string() }).index("by_user", ["userId"]),

  warga: defineTable({
    nama: v.string(),
    noRumah: v.string(),
    noWa: v.string(),
    statusHunian: v.union(v.literal("tetap"), v.literal("kontrak")),
    blok: v.optional(v.string()),
    catatan: v.optional(v.string()),
    aktif: v.boolean(),
  }).index("by_rumah", ["noRumah"]),

  // Jenis kas dinamis: iuran wajib, jimpitan, bolo pecah, dst. Tambah dari aplikasi, tanpa ubah kode.
  jenisKas: defineTable({
    nama: v.string(),
    periode, // bulanan | sekali | bebas (sukarela, tanpa tagihan)
    nominal: v.number(),
    nominalKontrak: v.optional(v.number()),
    petugasIds: v.array(v.id("users")),
    aktif: v.boolean(),
    urutan: v.number(),
    saldoAwal: v.number(),
  }),

  tagihan: defineTable({
    wargaId: v.id("warga"),
    kasId: v.id("jenisKas"),
    periode: v.string(), // "2026-11" atau "sekali"
    nominal: v.number(),
    terbayar: v.number(),
  })
    .index("by_warga_kas_periode", ["wargaId", "kasId", "periode"])
    .index("by_periode", ["periode"])
    .index("by_kas", ["kasId"]),

  pembayaran: defineTable({
    wargaId: v.id("warga"),
    kasId: v.id("jenisKas"),
    jumlah: v.number(),
    tanggal: v.string(),
    petugasId: v.id("users"),
    metode: v.optional(v.string()),
    catatan: v.optional(v.string()),
    alokasi: v.array(v.object({ tagihanId: v.id("tagihan"), jumlah: v.number() })),
    noKuitansi: v.string(),
    batal: v.boolean(),
    alasanBatal: v.optional(v.string()),
  })
    .index("by_kas", ["kasId"])
    .index("by_tanggal", ["tanggal"]),

  pengeluaran: defineTable({
    kasId: v.id("jenisKas"),
    jumlah: v.number(),
    tanggal: v.string(),
    keterangan: v.string(),
    fotoId: v.optional(v.id("_storage")),
    petugasId: v.id("users"),
    batal: v.boolean(),
    alasanBatal: v.optional(v.string()),
  })
    .index("by_kas", ["kasId"])
    .index("by_tanggal", ["tanggal"]),

  event: defineTable({
    judul: v.string(),
    tanggal: v.string(),
    jam: v.optional(v.string()),
    tempat: v.string(),
    deskripsi: v.optional(v.string()),
    diproses: v.boolean(), // tagihan H+1 sudah diproses
  }).index("by_tanggal", ["tanggal"]),

  // Antrean pesan WA (undangan & tagihan) per warga per acara
  antrean: defineTable({
    jenis: v.union(v.literal("undangan"), v.literal("tagihan")),
    eventId: v.id("event"),
    wargaId: v.id("warga"),
    status: v.union(v.literal("menunggu"), v.literal("terkirim")),
    terkirimPada: v.optional(v.number()),
    rincian: v.optional(v.string()),
    total: v.optional(v.number()),
  }).index("by_event", ["eventId", "jenis"]),

  pengaturan: defineTable({ kunci: v.string(), nilai: v.string() }).index("by_kunci", ["kunci"]),

  log: defineTable({ userId: v.id("users"), nama: v.string(), aksi: v.string(), detail: v.string() }),
});
