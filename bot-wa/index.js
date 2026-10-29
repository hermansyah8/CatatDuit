import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import pino from 'pino'

dotenv.config()

// 1. Bersihkan dan Inisialisasi Supabase
const rawUrl = process.env.SUPABASE_URL || ''
const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const targetUserId = process.env.TARGET_USER_ID

if (!supabaseUrl || !serviceRoleKey || !targetUserId) {
  console.error('\n❌ Kredensial di bot-wa/.env belum lengkap!')
  console.error('Pastikan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan TARGET_USER_ID sudah terisi.\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// 2. Fungsi Parser Pintar Teks Bahasa Indonesia
function parsePesanKeuangan(text) {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  // Parsing angka nominal (contoh: 20rb, 20k, 9jt, 25.000, 20000)
  let amount = 0
  const matchJt = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i)
  const matchK = clean.match(/(\d+)\s*(?:rb|k|ribu)/i)

  if (matchJt) {
    amount = Math.round(parseFloat(matchJt[1].replace(',', '.')) * 1000000)
  } else if (matchK) {
    amount = parseInt(matchK[1], 10) * 1000
  } else {
    const matchNumber = clean.replace(/\./g, '').match(/\b(\d{3,12})\b/)
    if (matchNumber) {
      amount = parseInt(matchNumber[1], 10)
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) return null

  // Deteksi Tipe & Kategori Otomatis
  let type = 'expense'
  let category = 'Lainnya'

  if (
    lower.includes('gaji') ||
    lower.includes('bonus') ||
    lower.includes('thr') ||
    lower.includes('transfer masuk') ||
    lower.includes('dapat duit') ||
    lower.includes('pemasukan')
  ) {
    type = 'income'
    category = lower.includes('bonus') || lower.includes('thr') ? 'Bonus' : 'Gaji'
  } else if (
    lower.includes('makan') ||
    lower.includes('kopi') ||
    lower.includes('cilok') ||
    lower.includes('nasi') ||
    lower.includes('bakso') ||
    lower.includes('mie') ||
    lower.includes('sarapan') ||
    lower.includes('ayam') ||
    lower.includes('snack') ||
    lower.includes('es ')
  ) {
    category = 'Makanan'
  } else if (
    lower.includes('bensin') ||
    lower.includes('pertalite') ||
    lower.includes('pertamax') ||
    lower.includes('gojek') ||
    lower.includes('grab') ||
    lower.includes('ojol') ||
    lower.includes('parkir') ||
    lower.includes('tol')
  ) {
    category = 'Transportasi'
  } else if (
    lower.includes('pulsa') ||
    lower.includes('kuota') ||
    lower.includes('listrik') ||
    lower.includes('pln') ||
    lower.includes('air') ||
    lower.includes('wifi') ||
    lower.includes('tagihan')
  ) {
    category = 'Tagihan'
  } else if (
    lower.includes('beli') ||
    lower.includes('belanja') ||
    lower.includes('sepatu') ||
    lower.includes('baju') ||
    lower.includes('shopee') ||
    lower.includes('tokopedia')
  ) {
    category = 'Belanja'
  } else if (
    lower.includes('obat') ||
    lower.includes('dokter') ||
    lower.includes('apotek') ||
    lower.includes('klinik')
  ) {
    category = 'Kesehatan'
  }

  // Bersihkan teks deskripsi dari angka
  let description = clean
    .replace(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|k|ribu)?)/gi, '')
    .replace(/\brp\b/gi, '')
    .trim()

  if (!description) description = category

  return {
    amount,
    type,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
  }
}

// 3. Menjalankan Bot WhatsApp Baileys
async function startWhatsAppBot() {
  console.log('\n======================================================')
  console.log('🤖 MENYIAPKAN BOT WHATSAPP CATATDUIT...')
  console.log('======================================================')
  console.log(`📡 Supabase Endpoint : ${supabaseUrl}`)
  console.log(`👤 Target User UID  : ${targetUserId}`)
  console.log('------------------------------------------------------')

  const { state, saveCreds } = await useMultiFileAuthState('auth_session')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // Heningkan log sistem yang berlebihan
  })

  // Event Pembaruan Koneksi (QR Code & Status)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n📲 SILAKAN SCAN QR CODE INI MENGGUNAKAN WHATSAPP DI HP ANDA:')
      console.log('   (Buka WhatsApp -> Menu Titik Tiga / Pengaturan -> Perangkat Tertaut / Linked Devices)\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : null

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log('\n⚠️  Koneksi terputus. Mencoba menghubungkan kembali...', shouldReconnect ? 'YA' : 'TIDAK (Logged Out)')
      if (shouldReconnect) {
        startWhatsAppBot()
      }
    } else if (connection === 'open') {
      console.log('\n✅ ====================================================')
      console.log('🎉 BOT WHATSAPP TELAH BERHASIL TERHUBUNG DENGAN NOMOR ANDA!')
      console.log('   Kini setiap chat pengeluaran/pemasukan akan otomatis')
      console.log('   dicatat langsung ke database Supabase Anda.')
      console.log('====================================================\n')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // Event Pesan Masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg?.message) return

    const sender = msg.key.remoteJid
    const isFromMe = msg.key.fromMe

    // Ambil isi teks pesan (mendukung pesan biasa dan extended text)
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    if (!text || text.trim().length === 0) return

    // Coba ekstrak data keuangan dari teks
    const parsed = parsePesanKeuangan(text)
    if (!parsed) {
      // Jika pesan tidak mengandung format keuangan yang valid,
      // jangan spam jika pesan berasal dari grup atau status
      if (sender.endsWith('@g.us')) return
      
      // Kirim panduan jika pengguna mengetik "help" atau "bantuan"
      if (['halo', 'hi', 'bantuan', 'help', 'menu'].includes(text.toLowerCase().trim())) {
        await sock.sendMessage(sender, {
          text: `Halo! Saya bot pencatat keuangan CatatDuit 💳\n\nKirim pesan dengan nama dan nominal transaksi Anda, contoh:\n• *Cilok 5000*\n• *Beli bensin 20rb*\n• *Makan bakso 25.000*\n• *Gaji bulanan 9jt*\n\nTransaksi akan otomatis tercatat ke dashboard website Anda!`,
        })
      }
      return
    }

    console.log(`\n📩 Pesan Masuk dari ${sender}: "${text}"`)
    console.log(`   👉 Terdeteksi: ${parsed.description} | Rp ${parsed.amount.toLocaleString('id-ID')} (${parsed.category})`)

    // Simpan ke Supabase PostgreSQL menggunakan Service Role Key
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase.from('transactions').insert([
      {
        user_id: targetUserId,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        transaction_date: today,
        source: 'whatsapp', // Label sumber WhatsApp
      },
    ]).select()

    if (error) {
      console.error('❌ Gagal menyimpan ke Supabase:', error.message)
      await sock.sendMessage(sender, {
        text: `❌ Gagal menyimpan transaksi: ${error.message}`,
      })
    } else {
      console.log(`✅ Berhasil tersimpan di Supabase dengan ID: ${data[0].id}`)

      // Kirim pesan tanda terima (struk) rapi balik ke WhatsApp
      const pesanBalasan =
`✅ *Transaksi Berhasil Dicatat!*
━━━━━━━━━━━━━━━━━━
📝 *Keterangan:* ${parsed.description}
🏷️ *Kategori:* ${parsed.category}
💰 *Nominal:* Rp ${parsed.amount.toLocaleString('id-ID')}
📌 *Tipe:* ${parsed.type === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
📱 *Sumber:* WhatsApp

_Buka http://localhost:5173 untuk melihat pembaruan saldo & grafik._`

      await sock.sendMessage(sender, { text: pesanBalasan })
    }
  })
}

startWhatsAppBot()
