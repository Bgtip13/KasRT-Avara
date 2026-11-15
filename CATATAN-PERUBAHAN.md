# Catatan perubahan

## Cara memasang
1. `npx convex deploy` (atau `npx convex dev`). Skema berubah: peran `warga`, field `users.wargaId`, index `users.by_warga` dan `pembayaran.by_warga`, modul baru `akun.ts`. Data lama tetap valid.
2. Bangun ulang aplikasi native (`eas build`). `app.json` berubah (splash, ikon), jadi tidak cukup OTA update. Tidak ada dependensi baru.
3. Login sebagai admin, buka Lainnya > Pengguna & peran > "Buat akun semua warga" (atau buat satu per satu).

## Peran
| Peran | Akses |
|---|---|
| Admin (pemilik aplikasi) | Semua |
| Petugas kas | Catat pembayaran/pengeluaran untuk kas yang ditugaskan, lihat laporan |
| Pengawas (RT) | Lihat semua data dan laporan, tanpa mengubah |
| Warga | Hanya tunggakan, riwayat pembayaran rumahnya sendiri, daftar acara |

Akun warga dihubungkan ke satu data warga (`users.wargaId`). Query data seluruh RT sekarang menolak akun warga di sisi server.
