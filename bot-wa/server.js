import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

// 1. Normalisasi URL & Inisialisasi Supabase Client dengan Service Role Key
const rawUrl = process.env.SUPABASE_URL || ''
const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const targetUserId = process.env.TARGET_USER_ID

if (!supabaseUrl || !serviceRoleKey || !targetUserId) {
  console.error('\n❌ Konfigurasi di bot-wa/.env belum lengkap!')
  console.error('Pastikan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan TARGET_USER_ID sudah terisi.\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// 2. Parser Pintar Pesan Keuangan Bahasa Indonesia
export function parsePesanKeuangan(text) {
  if (!text) return null
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

// 3. Setup Server Express
const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = process.env.PORT || 3001

// Route Beranda untuk pengecekan status server
app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    service: 'CatatDuit WhatsApp Bot Webhook Server',
    targetUserId: targetUserId,
    endpoints: {
      webhook: 'POST /webhook (Menerima pesan dari Fonnte / Wablas / Twilio / Simulator)',
      test: 'GET /test?text=Beli bensin 20rb',
    },
  })
})

// Route Endpoint Webhook Utama WhatsApp
// Kompatibel dengan Fonnte, Wablas, Twilio, atau script kirim lokal
app.post('/webhook', async (req, res) => {
  try {
    // Ambil isi teks pesan dari berbagai format gateway (Fonnte, Wablas, Twilio, dll)
    const body = req.body || {}
    const incomingText =
      body.message ||
      body.text ||
      body.Body ||
      body.msg ||
      (typeof body === 'string' ? body : '')

    const sender = body.sender || body.phone || body.From || 'Pengguna WhatsApp'

    console.log(`\n📩 Pesan WhatsApp Masuk dari [${sender}]: "${incomingText}"`)

    if (!incomingText) {
      return res.status(400).json({ error: 'Parameter pesan tidak ditemukan' })
    }

    // Parsing pesan menjadi transaksi keuangan
    const parsed = parsePesanKeuangan(incomingText)

    if (!parsed) {
      const panduan =
        'Format tidak dikenali. Silakan kirim dengan format transaksi dan nominal.\nContoh: "Beli bensin 20000" atau "Cilok 5rb"'
      return res.json({ reply: panduan })
    }

    // Simpan ke Supabase PostgreSQL dengan label source = 'whatsapp'
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: targetUserId,
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          transaction_date: today,
          source: 'whatsapp', // Tanda pengenal bahwa transaksi berasal dari WhatsApp
        },
      ])
      .select()

    if (error) {
      console.error('❌ Gagal menyimpan transaksi ke Supabase:', error.message)
      return res.status(500).json({ error: error.message })
    }

    const savedTx = data[0]
    console.log(`✅ Berhasil dicatat ke Supabase! ID: ${savedTx.id}`)
    console.log(`   🏷️  ${savedTx.description} | Rp ${savedTx.amount.toLocaleString('id-ID')} (${savedTx.category})`)

    // Format pesan balasan WhatsApp
    const replyMessage =
`✅ *Transaksi Berhasil Dicatat!*
━━━━━━━━━━━━━━━━━━
📝 *Keterangan:* ${savedTx.description}
🏷️ *Kategori:* ${savedTx.category}
💰 *Nominal:* Rp ${Number(savedTx.amount).toLocaleString('id-ID')}
📌 *Tipe:* ${savedTx.type === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
📱 *Sumber:* WhatsApp

_Buka http://localhost:5173 untuk melihat pembaruan saldo & grafik._`

    // Kirim respons balasan ke WhatsApp Gateway
    // Fonnte & Wablas otomatis mengirimkan kembali pesan ini ke chat WhatsApp pengirim
    return res.json({
      status: 'success',
      transaction: savedTx,
      reply: replyMessage,
    })
  } catch (err) {
    console.error('❌ Internal server error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// Route Endpoint Cepat untuk Pengujian Langsung via URL Browser
// Contoh: http://localhost:3001/test?text=Cilok 5000
app.get('/test', async (req, res) => {
  const text = req.query.text || 'Cilok 5000'
  const parsed = parsePesanKeuangan(text)
  if (!parsed) {
    return res.status(400).json({ error: 'Format tidak terdeteksi. Gunakan ?text=Beli bensin 20000' })
  }

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: targetUserId,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        transaction_date: today,
        source: 'whatsapp',
      },
    ])
    .select()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({
    pesan: '✅ Transaksi simulasi WhatsApp berhasil disimpan ke Supabase!',
    data: data[0],
    bukaWebsite: 'http://localhost:5173',
  })
})

app.listen(PORT, () => {
  console.log('\n======================================================')
  console.log(`🚀 WHATSAPP BOT WEBHOOK SERVER AKTIF DI PORT: ${PORT}`)
  console.log('======================================================')
  console.log(`📡 URL Supabase   : ${supabaseUrl}`)
  console.log(`👤 User UID Target: ${targetUserId}`)
  console.log(`🔗 Endpoint Webhook: http://localhost:${PORT}/webhook`)
  console.log(`🧪 Tes via Browser : http://localhost:${PORT}/test?text=Cilok%205000`)
  console.log('======================================================\n')
})
