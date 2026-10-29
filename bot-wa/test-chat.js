/**
 * Script cepat untuk menguji pengiriman pesan ke Webhook WhatsApp Bot
 * Jalankan:
 *   node test-chat.js "Cilok 5000"
 *   node test-chat.js "Beli bensin 20000"
 *   node test-chat.js "Gaji bulanan 9000000"
 */

const pesan = process.argv.slice(2).join(' ') || 'Cilok 5000'

console.log(`\n📤 Mengirim pesan simulasi WhatsApp: "${pesan}"...`)

fetch('http://localhost:3001/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sender: '681234567890@s.whatsapp.net',
    message: pesan,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.status === 'success') {
      console.log('\n✅ SUKSES! Transaksi berhasil diproses oleh webhook dan tersimpan di Supabase:')
      console.log(data.transaction)
      console.log('\n💬 Respon Balasan Bot ke WhatsApp:')
      console.log(data.reply)
      console.log('\n👉 Buka http://localhost:5173 untuk melihat transaksi di website!\n')
    } else {
      console.log('\n⚠️ Respon Webhook:', data)
    }
  })
  .catch((err) => {
    console.error('\n❌ Gagal terhubung ke server webhook:', err.message)
    console.error('Pastikan server bot sudah dijalankan dengan: npm start (di folder bot-wa)\n')
  })
