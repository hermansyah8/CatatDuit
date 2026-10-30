import TelegramBot from 'node-telegram-bot-api'
import { createClient } from '@supabase/supabase-js'

// ==============================================================================
// HELPER: WAKTU & TANGGAL (WIB / Asia/Jakarta)
// ==============================================================================
function getJakartaDateTime() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const today = formatter.format(now) // format: YYYY-MM-DD
  const yearMonth = today.slice(0, 7) // format: YYYY-MM
  return { today, yearMonth }
}

// ==============================================================================
// HELPER: NORMALISASI KATEGORI & PENCOCOKAN FLEKSIBEL
// ==============================================================================
function normalizeCategory(cat) {
  return (cat || '')
    .toLowerCase()
    .replace(/[_\s\-\+\/\&]+/g, ' ')
    .trim()
}

function isCategoryMatch(catA, catB) {
  const normA = normalizeCategory(catA)
  const normB = normalizeCategory(catB)
  if (!normA || !normB) return false
  if (normA === normB) return true

  // Aturan khusus: nenda / abah / nenda abah saling cocok
  const isNendaAbahA = normA === 'nenda abah' || normA === 'nenda' || normA === 'abah'
  const isNendaAbahB = normB === 'nenda abah' || normB === 'nenda' || normB === 'abah'
  if (isNendaAbahA && isNendaAbahB) return true

  // Cek apakah salah satu kata utuh cocok (misal: "belanja" dalam "belanja bulanan")
  const wordsA = normA.split(' ').filter(Boolean)
  const wordsB = normB.split(' ').filter(Boolean)
  if (wordsA.length === 1 && wordsB.includes(wordsA[0])) return true
  if (wordsB.length === 1 && wordsA.includes(wordsB[0])) return true

  if (normA.startsWith(normB) || normB.startsWith(normA)) return true
  return false
}

// ==============================================================================
// PARSER PINTAR PESAN KEUANGAN
// ==============================================================================
function parsePesanKeuangan(text, availableCategories = []) {
  if (!text) return null
  const clean = text.trim()
  const lower = clean.toLowerCase()

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

  let type = 'expense'
  let category = 'Lainnya'

  // 1. Deteksi Prioritas: Nenda + Abah dengan Word Boundary (\b)
  let matchedCustomCategory = null
  if (/\b(nenda|abah)\b/i.test(clean)) {
    const targetCat = availableCategories.find((cat) => isCategoryMatch(cat, 'nenda+abah')) || 'nenda+abah'
    matchedCustomCategory = targetCat
  } else {
    // 2. Cek apakah ada kategori anggaran pengguna yang cocok dalam teks
    for (const cat of availableCategories) {
      const normCat = normalizeCategory(cat)
      if (lower.includes(normCat) || isCategoryMatch(clean, cat)) {
        matchedCustomCategory = cat
        break
      }
      // Cek kata kunci spesifik per kata dengan word boundary
      const words = normCat.split(' ').filter((w) => w.length > 2 && w !== 'dan' && w !== 'belanja')
      for (const w of words) {
        const wordRegex = new RegExp(`\\b${w}\\b`, 'i')
        if (wordRegex.test(clean)) {
          matchedCustomCategory = cat
          break
        }
      }
      if (matchedCustomCategory) break
    }
  }

  if (matchedCustomCategory) {
    category = matchedCustomCategory
  } else if (
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
    lower.includes('susu')
  ) {
    category = 'Susu Kotak'
  } else if (
    lower.includes('belanja bulanan')
  ) {
    category = 'Belanja Bulanan'
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
    lower.includes('tol') ||
    lower.includes('transport')
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
    category = 'Belanja Bulanan'
  } else if (
    lower.includes('hiburan') ||
    lower.includes('nonton') ||
    lower.includes('bioskop') ||
    lower.includes('game') ||
    lower.includes('wisata') ||
    lower.includes('jalan-jalan')
  ) {
    category = 'Hiburan'
  } else if (
    lower.includes('obat') ||
    lower.includes('dokter') ||
    lower.includes('apotek') ||
    lower.includes('klinik') ||
    lower.includes('sehat')
  ) {
    category = 'Kesehatan'
  }

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

// ==============================================================================
// LOGIKA PEMROSESAN PESAN TELEGRAM
// ==============================================================================
async function handleTelegramMessage(bot, supabase, msg) {
  const chatId = msg.chat?.id
  const telegramUserId = msg.from?.id || chatId
  const rawText = (msg.text || '').trim()

  if (!chatId || !rawText) return

  // 1. Cek perintah tautan /start LINK-XXXX atau /connect LINK-XXXX atau "LINK-XXXX"
  const linkTokenMatch = rawText.match(/^(?:\/start\s+|\/connect\s+|)([A-Za-z0-9_-]{6,32})$/i)
  const isDirectToken = linkTokenMatch && linkTokenMatch[1].toUpperCase().startsWith('LINK')

  if (isDirectToken) {
    const inputToken = linkTokenMatch[1].trim().toUpperCase()

    // Cari token di database
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_link_tokens')
      .select('id, user_id, expires_at, is_used')
      .eq('token', inputToken)
      .maybeSingle()

    if (tokenError || !tokenData) {
      await bot.sendMessage(
        chatId,
        `❌ *Token tidak ditemukan.*\nPastikan kode token yang Anda masukkan benar dari website CatatDuit.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    if (tokenData.is_used) {
      await bot.sendMessage(
        chatId,
        `⚠️ *Token sudah pernah digunakan.*\nSilakan buat token baru melalui menu *Hubungkan Telegram* di website CatatDuit.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    if (now > expiresAt) {
      await bot.sendMessage(
        chatId,
        `⏳ *Token telah kedaluwarsa.*\nToken hanya berlaku selama 15 menit. Silakan buat token baru di website CatatDuit.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    // Cek apakah Telegram chatId ini sudah terhubung ke akun lain
    const { data: existingBinding } = await supabase
      .from('telegram_bindings')
      .select('id, user_id')
      .eq('telegram_chat_id', chatId)
      .maybeSingle()

    if (existingBinding) {
      if (existingBinding.user_id === tokenData.user_id) {
        await bot.sendMessage(
          chatId,
          `ℹ️ Akun Telegram Anda sudah terhubung ke akun website ini sebelumnya. Anda bisa langsung mencatat pengeluaran!`
        )
      } else {
        await bot.sendMessage(
          chatId,
          `⚠️ Akun Telegram ini sudah terhubung ke akun CatatDuit lain. Silakan ketik \`/unlink\` terlebih dahulu jika ingin berpindah akun.`
        )
      }
      return
    }

    // Hubungkan akun (Simpan ke telegram_bindings)
    const { error: bindError } = await supabase.from('telegram_bindings').insert([
      {
        user_id: tokenData.user_id,
        telegram_chat_id: chatId,
        telegram_user_id: telegramUserId,
        telegram_username: msg.from?.username || null,
        first_name: msg.from?.first_name || null,
      },
    ])

    if (bindError) {
      console.error('Gagal menghubungkan Telegram:', bindError.message)
      await bot.sendMessage(chatId, `❌ Gagal menghubungkan akun: ${bindError.message}`)
      return
    }

    // Tandai token sudah digunakan
    await supabase.from('telegram_link_tokens').update({ is_used: true }).eq('id', tokenData.id)

    // Ambil info email user
    const { data: userData } = await supabase.auth.admin.getUserById(tokenData.user_id)
    const userEmail = userData?.user?.email || 'Akun Anda'

    await bot.sendMessage(
      chatId,
      `🎉 *Selamat! Akun Telegram Berhasil Terhubung!*\n━━━━━━━━━━━━━━━━━━\n📧 *Email Terhubung:* \`${userEmail}\`\n👤 *Nama Telegram:* ${msg.from?.first_name || 'User'}\n\nKini Anda dapat langsung mencatat pengeluaran dari chat ini! Contoh pengiriman:\n• \`Belanja bulanan 500000\`\n• \`Beli bensin 25rb\`\n• \`Makan siang padang 30k\`\n• \`Gaji bulanan 9jt\`\n\nTransaksi akan otomatis tersimpan ke akun website Anda dan sisa anggaran bulan ini akan langsung dihitung!`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Cari apakah akun Telegram ini sudah terdaftar di telegram_bindings
  const { data: binding, error: bindingError } = await supabase
    .from('telegram_bindings')
    .select('user_id, first_name, telegram_username')
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (bindingError) {
    console.error('Error querying telegram_bindings:', bindingError.message)
  }

  // Jika user belum terhubung
  if (!binding) {
    if (rawText === '/start' || rawText.toLowerCase() === 'help' || rawText.toLowerCase() === 'halo') {
      await bot.sendMessage(
        chatId,
        `👋 *Halo ${msg.from?.first_name || ''}!* Selamat datang di Bot CatatDuit.\n\n⚠️ *Akun Telegram Anda belum terhubung ke website.*\n\n*Cara Menghubungkan:*
1. Buka website CatatDuit di browser dan Login ke akun Anda.
2. Klik tombol *Hubungkan Telegram* di dashboard untuk mendapatkan token sekali pakai.
3. Kirimkan kode token tersebut ke sini, contoh:\n   \`/connect LINK-XXXXXX\`\n\nSetelah terhubung, seluruh pengeluaran yang Anda catat di bot ini akan aman tersimpan ke akun Anda pribadi.`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    await bot.sendMessage(
      chatId,
      `⚠️ *Akun Belum Terhubung*\n\nAkun Telegram Anda belum terhubung dengan akun website CatatDuit manapun. Transaksi tidak dapat disimpan.\n\nSilakan login ke website CatatDuit, klik *Hubungkan Telegram* untuk membuat kode penghubung, lalu kirim ke sini:\nContoh: \`/connect LINK-XXXXXX\``,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Akun sudah terhubung! Ambil user_id dari binding
  const userId = binding.user_id

  // Perintah Bantuan / Panduan untuk User yang sudah terhubung
  if (rawText === '/start' || rawText.toLowerCase() === 'help' || rawText.toLowerCase() === 'halo') {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = userData?.user?.email || 'Akun Anda'

    await bot.sendMessage(
      chatId,
      `👋 *Halo ${msg.from?.first_name || ''}!* Bot CatatDuit siap mencatat transaksi Anda.\n\n🔗 *Status:* Terhubung ke \`${userEmail}\`\n\nKetik transaksi Anda kapan saja, contohnya:\n• \`Belanja bulanan 500000\`\n• \`Cilok 5000\`\n• \`Beli bensin 25rb\`\n• \`Makan siang padang 30.000\`\n• \`Gaji bulanan 9jt\`\n\nPerintah lainnya:\n• \`/status\` - Periksa status akun & info terhubung\n• \`/unlink\` - Putuskan hubungan akun dari Telegram ini`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Perintah Status
  if (rawText === '/status') {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = userData?.user?.email || 'Akun Anda'
    await bot.sendMessage(
      chatId,
      `ℹ️ *Status Akun CatatDuit*\n━━━━━━━━━━━━━━━━━━\n📧 *Email:* \`${userEmail}\`\n🆔 *User ID:* \`${userId}\`\n📱 *Chat ID:* \`${chatId}\`\n✅ Akun aktif dan terhubung.`,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Perintah Unlink
  if (rawText === '/unlink' || rawText === '/disconnect') {
    const { error: delError } = await supabase
      .from('telegram_bindings')
      .delete()
      .eq('telegram_chat_id', chatId)

    if (delError) {
      await bot.sendMessage(chatId, `❌ Gagal memutuskan akun: ${delError.message}`)
      return
    }

    await bot.sendMessage(
      chatId,
      `🔌 *Akun Berhasil Diputuskan!*\nAkun Telegram Anda tidak lagi terhubung ke website CatatDuit. Transaksi baru tidak akan dicatat sampai Anda menghubungkannya kembali.`
    )
    return
  }

  // Pencegahan Duplikasi Pesan (Idempotensi berdasarkan telegram_message_id)
  if (msg.message_id) {
    const { data: duplicateTx } = await supabase
      .from('transactions')
      .select('id, description, amount, created_at')
      .eq('user_id', userId)
      .eq('telegram_message_id', msg.message_id)
      .maybeSingle()

    if (duplicateTx) {
      await bot.sendMessage(
        chatId,
        `⚠️ *Pesan Duplikat Terdeteksi!*\nTransaksi "${duplicateTx.description}" senilai Rp ${Number(duplicateTx.amount).toLocaleString('id-ID')} sudah berhasil dicatat sebelumnya (ID: ${duplicateTx.id}). Tidak ada transaksi ganda yang dibuat.`,
        { parse_mode: 'Markdown' }
      )
      return
    }
  }

  // Ambil waktu Jakarta & daftar kategori anggaran aktif milik user pada bulan ini
  const { today, yearMonth } = getJakartaDateTime()

  const { data: userBudgets } = await supabase
    .from('category_budgets')
    .select('category, amount')
    .eq('user_id', userId)
    .eq('year_month', yearMonth)

  const activeCategories = (userBudgets || []).map((b) => b.category)

  // Parsing pesan keuangan
  const parsed = parsePesanKeuangan(rawText, activeCategories)
  if (!parsed) {
    await bot.sendMessage(
      chatId,
      `⚠️ Format tidak dikenali. Silakan ketik nama transaksi beserta nominalnya.\nContoh: \`Belanja bulanan 500000\` atau \`Beli bensin 20rb\``,
      { parse_mode: 'Markdown' }
    )
    return
  }

  // Simpan transaksi ke tabel 'transactions' milik user_id yang sesuai
  const { data: insertedData, error: insertError } = await supabase
    .from('transactions')
    .insert([
      {
        user_id: userId,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        transaction_date: today,
        source: 'telegram',
        telegram_message_id: msg.message_id || null,
      },
    ])
    .select()

  if (insertError) {
    console.error('❌ Gagal menyimpan transaksi ke Supabase:', insertError.message)
    await bot.sendMessage(chatId, `❌ Gagal menyimpan transaksi: ${insertError.message}`)
    return
  }

  const tx = insertedData[0]

  // Cek Penjatahan Anggaran Bulanan & Hitung Pengurangan Otomatis
  let budgetInfoText = ''

  if (tx.type === 'expense') {
    const matchedBudget = (userBudgets || []).find(
      (b) => isCategoryMatch(b.category, tx.category)
    )

    if (matchedBudget) {
      const { data: allExpenseTxs } = await supabase
        .from('transactions')
        .select('amount, category')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('transaction_date', `${yearMonth}-01`)
        .lte('transaction_date', `${yearMonth}-31`)

      const totalTerpakai = (allExpenseTxs || []).reduce((sum, item) => {
        if (isCategoryMatch(item.category, matchedBudget.category)) {
          return sum + Number(item.amount || 0)
        }
        return sum
      }, 0)
      const anggaranAwal = Number(matchedBudget.amount)
      const sisaAnggaran = anggaranAwal - totalTerpakai
      const persentaseTerpakai = Math.round((totalTerpakai / anggaranAwal) * 10000) / 100

      const formatPersen = persentaseTerpakai.toLocaleString('id-ID', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })

      let statusWarning = ''
      if (sisaAnggaran < 0) {
        statusWarning = `\n🚨 *PERINGATAN: Pengeluaran melebihi anggaran sebesar Rp ${Math.abs(sisaAnggaran).toLocaleString('id-ID')}!*`
      } else if (persentaseTerpakai >= 80) {
        statusWarning = `\n⚠️ *Perhatian: Anggaran kategori ini sudah terpakai ${formatPersen}%!*`
      }

      budgetInfoText = `
📊 *Status Anggaran ${matchedBudget.category} (${yearMonth}):*
• Anggaran awal: Rp ${anggaranAwal.toLocaleString('id-ID')}
• Total terpakai: Rp ${totalTerpakai.toLocaleString('id-ID')}
• Sisa anggaran: ${sisaAnggaran < 0 ? '-' : ''}Rp ${Math.abs(sisaAnggaran).toLocaleString('id-ID')}
• Persentase terpakai: ${formatPersen}%${statusWarning}`
    } else {
      budgetInfoText = `\nℹ️ _Kategori "${tx.category}" belum memiliki anggaran di bulan ${yearMonth}. Anda dapat mengaturnya di website._`
    }
  }

  const balasan =
`✅ *Transaksi Berhasil Dicatat!*
━━━━━━━━━━━━━━━━━━
📝 *Keterangan:* ${tx.description}
🏷️ *Kategori:* ${tx.category}
💰 *Nominal:* Rp ${Number(tx.amount).toLocaleString('id-ID')}
📌 *Tipe:* ${tx.type === 'income' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
📅 *Tanggal:* ${today}
✈️ *Sumber:* Telegram
${budgetInfoText}

_Buka website untuk melihat rincian riwayat & grafik keuangan._`

  await bot.sendMessage(chatId, balasan, { parse_mode: 'Markdown' })
}

// ==============================================================================
// VERCEL SERVERLESS FUNCTION HANDLER
// ==============================================================================
export default async function handler(req, res) {
  // 1. Health check via GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Bot Telegram webhook is active'
    })
  }

  // 2. Hanya izinkan POST untuk Telegram Webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // 3. Baca Environment Variables
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!supabaseUrl || !serviceRoleKey || !botToken) {
    console.error('Kredensial SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, atau TELEGRAM_BOT_TOKEN belum lengkap di Environment Variables!')
    // Tetap kirim status 200 agar Telegram tidak melakukan retry berulang
    return res.status(200).json({ ok: true, error: 'Environment variables not configured' })
  }

  // 4. Inisialisasi Supabase & Telegram Bot (tanpa polling)
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const bot = new TelegramBot(botToken)

  // 5. Normalisasi Update Body
  let update = req.body
  if (typeof update === 'string') {
    try {
      update = JSON.parse(update)
    } catch (parseError) {
      console.error('Gagal parsing JSON webhook:', parseError)
      return res.status(200).json({ ok: true, error: 'Invalid JSON body' })
    }
  }

  // 6. Tangani pesan Telegram
  try {
    const msg = update?.message || update?.edited_message
    if (msg) {
      await handleTelegramMessage(bot, supabase, msg)
    }
  } catch (err) {
    console.error('Terjadi kesalahan saat memproses update webhook:', err)
  }

  // 7. Selalu respons dengan 200 { ok: true }
  return res.status(200).json({ ok: true })
}

