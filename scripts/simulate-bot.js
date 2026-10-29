/**
 * ==============================================================================
 * SCRIPT SIMULATOR BOT WHATSAPP / TELEGRAM
 * ==============================================================================
 * Skrip ini mensimulasikan bagaimana backend bot WhatsApp / Telegram bekerja:
 * 1. Menerima pesan teks (contoh: "Beli bensin 25000" atau "Makan siang 35000")
 * 2. Mem-parsing teks menjadi: Deskripsi, Kategori, Nominal, dan Tipe (Pemasukan/Pengeluaran)
 * 3. Menyimpan data langsung ke tabel Supabase dengan source = 'whatsapp' atau 'telegram'
 * 4. Data langsung muncul di website dashboard Anda dengan badge hijau WhatsApp!
 *
 * Cara Menjalankan:
 *   node scripts/simulate-bot.js "Beli bensin 25000" --wa
 *   node scripts/simulate-bot.js "Makan siang Padang 30000" --tg
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. Baca kredensial dari file .env
const envPath = path.resolve(__dirname, '../.env')
if (!fs.existsSync(envPath)) {
  console.error('\n❌ File .env tidak ditemukan! Buat file .env terlebih dahulu.\n')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach((line) => {
  const [key, ...rest] = line.trim().split('=')
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join('=').trim()
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum terisi di .env!\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 2. Parser Pintar Sederhana untuk Pesan Teks Bot
function parseBotMessage(text) {
  const clean = text.trim()

  // Ambil angka / nominal (contoh: 25000, 25.000, 25k, rp25000)
  let amount = 0
  const matchK = clean.match(/(\d+)\s*(?:rb|k)/i)
  if (matchK) {
    amount = parseInt(matchK[1], 10) * 1000
  } else {
    const matchNumber = clean.replace(/\./g, '').match(/\b(\d{3,10})\b/)
    if (matchNumber) {
      amount = parseInt(matchNumber[1], 10)
    }
  }

  // Tentukan Tipe dan Kategori Otomatis berdasarkan kata kunci
  const lower = clean.toLowerCase()
  let type = 'expense'
  let category = 'Lainnya'

  if (lower.includes('gaji') || lower.includes('bonus') || lower.includes('transfer masuk') || lower.includes('dapat duit')) {
    type = 'income'
    category = lower.includes('bonus') ? 'Bonus' : 'Gaji'
  } else if (lower.includes('makan') || lower.includes('kopi') || lower.includes('cilok') || lower.includes('bakso') || lower.includes('ayam') || lower.includes('snack') || lower.includes('nasi')) {
    category = 'Makanan'
  } else if (lower.includes('bensin') || lower.includes('ojol') || lower.includes('grab') || lower.includes('gojek') || lower.includes('tol') || lower.includes('parkir')) {
    category = 'Transportasi'
  } else if (lower.includes('listrik') || lower.includes('air') || lower.includes('wifi') || lower.includes('pulsa') || lower.includes('tagihan')) {
    category = 'Tagihan'
  } else if (lower.includes('baju') || lower.includes('sepatu') || lower.includes('belanja') || lower.includes('beli')) {
    category = 'Belanja'
  } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek')) {
    category = 'Kesehatan'
  }

  // Deskripsi adalah pesan tanpa angka nominal
  const description = clean.replace(/(\d+[\d.,]*\s*(?:rb|k)?)/gi, '').replace(/\brp\b/gi, '').trim() || clean

  return {
    amount: amount || 15000, // default jika tidak mendeteksi angka
    type,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
  }
}

// 3. Eksekusi Simulasi
async function runSimulator() {
  const args = process.argv.slice(2)
  const isTelegram = args.some((a) => a.includes('--tg') || a.includes('telegram'))
  const source = isTelegram ? 'telegram' : 'whatsapp'
  const rawText = args.filter((a) => !a.startsWith('--')).join(' ') || 'Beli nasi goreng 22000'

  console.log('\n======================================================')
  console.log(`🤖 SIMULASI INPUT TRANSAKSI DARI ${source.toUpperCase()}`)
  console.log('======================================================')
  console.log(`📩 Pesan Masuk dari ${source === 'whatsapp' ? 'WhatsApp' : 'Telegram'}: "${rawText}"`)

  const parsed = parseBotMessage(rawText)
  console.log(`🔍 Hasil Parsing Bot:`)
  console.log(`   - Deskripsi : ${parsed.description}`)
  console.log(`   - Kategori  : ${parsed.category}`)
  console.log(`   - Tipe      : ${parsed.type === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}`)
  console.log(`   - Nominal   : Rp ${parsed.amount.toLocaleString('id-ID')}`)
  console.log(`   - Sumber    : ${source}`)
  console.log('------------------------------------------------------')

  // Untuk menyimpan ke Supabase dengan RLS aktif, kita butuh akun yang terdaftar
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question('Masukkan Email yang Anda gunakan login di website: ', (email) => {
    rl.question('Masukkan Password akun Anda: ', async (password) => {
      rl.close()
      console.log('\n⏳ Mengautentikasi dan menyimpan transaksi ke Supabase...')

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (authError) {
        console.error(`\n❌ Gagal login: ${authError.message}`)
        console.error('Pastikan Anda sudah mendaftarkan email & password ini di website (http://localhost:5173).\n')
        process.exit(1)
      }

      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase.from('transactions').insert([
        {
          user_id: authData.user.id,
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          transaction_date: today,
          source: source,
        },
      ]).select()

      if (error) {
        console.error(`\n❌ Gagal menyimpan ke tabel transactions: ${error.message}\n`)
      } else {
        console.log(`\n✅ BERHASIL DISIMPAN! ID Transaksi: ${data[0].id}`)
        console.log(`🎉 Buka kembali website Anda di http://localhost:5173/ dan refresh`)
        console.log(`   Transaksi akan muncul dengan badge warna ${source === 'whatsapp' ? 'HIJAU (WhatsApp)' : 'BIRU (Telegram)'}!\n`)
      }
    })
  })
}

runSimulator()
