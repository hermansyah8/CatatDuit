# CatatDuit - Aplikasi Pencatatan Keuangan Bulanan Pribadi

Aplikasi web modern, responsif, dan aman untuk mencatat pemasukan, pengeluaran, dan memantau saldo bulanan pribadi. Dibangun menggunakan **React (Vite)** dan **Supabase PostgreSQL**, serta dipersiapkan untuk integrasi bot WhatsApp/Telegram di masa mendatang.

---

## 🌟 Fitur Utama

1. **Dashboard Ringkasan Keuangan**: Menampilkan total pemasukan, total pengeluaran, dan sisa saldo secara otomatis pada periode bulan berjalan.
2. **Form Transaksi**: Menambah dan mengedit transaksi dengan validasi nominal, kategori, tanggal, dan deskripsi.
3. **Riwayat & Tabel Transaksi**: Menampilkan daftar transaksi lengkap dengan badge tipe (*income*/*expense*) dan badge sumber input (*Web Manual*, *Telegram*, *WhatsApp*).
4. **Anggaran Bulanan per Kategori (Budgeting)**: Menetapkan target pagu anggaran, pemantauan sisa saldo, progress bar, dan status peringatan (Normal / Siaga / Overbudget).
5. **Ekspor Laporan Bulanan (PDF)**: Cetak dan unduh laporan rekapitulasi keuangan bulanan berformat PDF lengkap dengan tabel transaksi dan analisis anggaran.
6. **Integrasi Bot Telegram Interaktif**: Catat transaksi langsung via chat Telegram (`/start`, input teks otomatis, `/status`, `/laporan`).
7. **Filter Fleksibel**: Memfilter transaksi berdasarkan bulan, tipe, atau kategori tertentu.
8. **Grafik Pengeluaran per Kategori**: Visualisasi distribusi pengeluaran berbentuk grafik donat interaktif.
9. **Desain Responsif**: Tampilan optimal untuk smartphone, tablet, maupun komputer/laptop.
10. **Keamanan Data (RLS)**: Setiap transaksi dilindungi oleh *Row Level Security* (RLS) di PostgreSQL, memastikan setiap pengguna hanya dapat melihat dan memodifikasi datanya sendiri.

---

## 📁 Struktur Folder Proyek

```text
catat-duit/
├── bot-tg/                   # Layanan Bot Telegram (Node.js & Supabase Service Role)
│   ├── .env.example
│   ├── index.js
│   └── package.json
├── bot-wa/                   # Layanan Bot WhatsApp Webhook/Baileys
│   ├── .env.example
│   ├── index.js
│   └── package.json
├── public/
│   ├── favicon.svg           # Ikon aplikasi
│   └── icons.svg
├── scripts/                  # Skrip simulasi & pengujian otomatis
│   ├── simulate-bot.js
│   ├── test-nenda.js
│   └── test-scenarios.js
├── src/
│   ├── components/
│   │   ├── AuthModal.jsx             # Form Masuk (Login) & Daftar Akun baru
│   │   ├── BudgetDashboard.jsx       # Kartu pemantauan sisa & progres anggaran
│   │   ├── BudgetModal.jsx           # Modal input/edit anggaran kategori
│   │   ├── CategoryChart.jsx         # Grafik donat SVG dan breakdown pengeluaran
│   │   ├── ConfigNotice.jsx          # Panduan setup jika .env belum terpasang
│   │   ├── DashboardCards.jsx        # Kartu ringkasan Pemasukan, Pengeluaran, Saldo
│   │   ├── FilterBar.jsx             # Filter berdasarkan bulan, tipe, dan kategori
│   │   ├── MonthlyReportModal.jsx    # Modal preview & cetak laporan bulanan ke PDF
│   │   ├── Navbar.jsx                # Header navigasi, info user, dan tombol logout
│   │   ├── TelegramConnectModal.jsx  # Modal panduan menghubungkan bot Telegram
│   │   ├── TransactionForm.jsx       # Modal form tambah & edit transaksi
│   │   └── TransactionList.jsx       # Daftar riwayat transaksi dengan aksi edit/hapus
│   ├── lib/
│   │   └── supabase.js         # Inisialisasi klien Supabase & validasi env
│   ├── utils/
│   │   ├── categories.js       # Normalisasi kategori & pencocokan kata kunci
│   │   └── formatters.js       # Helper mata uang Rupiah & tanggal Indonesia
│   ├── App.jsx                 # Komponen utama & manajemen state transaksi
│   ├── index.css               # Styling global Tailwind CSS
│   └── main.jsx                # Entry point aplikasi React
├── supabase/
│   ├── schema.sql                           # Skrip dasar skema tabel & RLS
│   └── migrations_multiuser_and_budget.sql  # Migrasi tabel budgets & telegram_bindings
├── .env.example                # Template konfigurasi environment frontend
├── vercel.json                 # Konfigurasi SPA routing untuk hosting di Vercel
├── package.json                # Daftar dependensi dan scripts npm
└── README.md                   # Dokumentasi panduan lengkap
```

---

## 🛠️ Langkah-Langkah Menjalankan Secara Lokal

### 1. Clone atau Masuk ke Folder Proyek
Buka terminal dan arahkan ke folder proyek:
```bash
git clone https://github.com/USERNAME/catat-duit.git
cd catat-duit
npm install
```

### 2. Siapkan Database di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan buat project baru (gratis).
2. Di dashboard project Supabase Anda, klik menu **SQL Editor** pada sidebar kiri.
3. Buka file `supabase/schema.sql` di proyek ini, salin seluruh kodenya, tempel ke SQL Editor Supabase, lalu klik **Run**.
4. Skrip ini akan membuat tabel `transactions`, mengaktifkan Row Level Security (RLS), membuat indeks performa, dan menyiapkan kolom `source` (`manual`, `whatsapp`, `telegram`).

### 3. Dapatkan Kredensial API Supabase
1. Di dashboard Supabase, buka menu **Project Settings** (ikon gerigi) → **API**.
2. Salin **Project URL**.
3. Salin **Project API Keys** bagian `anon` / `public`.
   > ⚠️ **PENTING**: Jangan pernah menggunakan `service_role` secret key di file frontend!

### 4. Konfigurasi File `.env`
Buat file baru bernama `.env` di dalam folder proyek (sejajar dengan `package.json`), lalu isi:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Ganti dengan URL dan Anon Key asli dari project Supabase Anda)*

### 5. Jalankan Aplikasi
Jika menggunakan Windows PowerShell dan mendapati kendala execution policy, gunakan perintah `npm.cmd`:
```bash
npm.cmd run dev
```
*(Atau `npm run dev` di Command Prompt / Git Bash)*

Buka tautan lokal yang muncul di browser, biasanya:
```
http://localhost:5173
```

---

## 🔒 Desain Keamanan & Autentikasi

- **Row Level Security (RLS)**: Tabel `transactions` memiliki aturan RLS yang memastikan klausa `auth.uid() = user_id`. Pengguna A tidak akan pernah bisa mengintip atau memodifikasi transaksi milik Pengguna B.
- **Frontend Safe**: Hanya `anon` public key yang disertakan di browser. Semua mutasi data diverifikasi oleh token JWT sesi pengguna.

---

## 🚀 Rencana Integrasi WhatsApp (Fase 2)

Kolom `source` pada tabel `transactions` telah disiapkan dengan tipe:
`check (source in ('manual', 'whatsapp', 'telegram'))`

Pada tahap berikutnya ketika bot WhatsApp dibuat:
1. Bot WhatsApp (menggunakan Node.js/Python webhook, misalnya via Fonnte, Twilio, atau Baileys) akan berjalan di server backend terpisah atau Supabase Edge Functions.
2. Bot menerima pesan teks (contoh: *"Beli bensin 20000"*).
3. Bot mem-parsing nominal dan kategori menggunakan AI/Regex.
4. Bot menyisipkan data ke tabel `transactions` menggunakan **Supabase Service Role Key** (hanya di backend) dengan `source = 'whatsapp'` dan mencocokkan nomor WhatsApp ke `user_id`.
