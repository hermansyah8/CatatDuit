import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Unlink,
  Loader2,
  X,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function TelegramConnectModal({ isOpen, onClose, user, isDemoMode }) {
  const [binding, setBinding] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeToken, setActiveToken] = useState(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // 1. Ambil data binding saat modal dibuka
  const fetchBinding = useCallback(async () => {
    if (!user || isDemoMode || !supabase) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('telegram_bindings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && !error.message.includes('relation "public.telegram_bindings" does not exist')) {
        console.error('Error fetching binding:', error)
      }

      setBinding(data || null)
    } catch (err) {
      console.warn('Telegram bindings table check:', err.message)
    } finally {
      setLoading(false)
    }
  }, [user, isDemoMode])

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
      fetchBinding()
    }
  }, [isOpen, fetchBinding])

  // Polling cek apakah akun sudah terhubung ketika token aktif ditampilkan
  useEffect(() => {
    if (!isOpen || binding || !activeToken || isDemoMode) return

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('telegram_bindings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (data) {
          setBinding(data)
          setActiveToken(null)
          setSuccessMsg('Selamat! Akun Telegram Anda berhasil terhubung.')
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isOpen, binding, activeToken, isDemoMode, user])

  // 2. Generate Token Baru Sekali Pakai (Expired 15 menit)
  const handleGenerateToken = async () => {
    setErrorMsg('')
    setActionLoading(true)

    if (isDemoMode) {
      const demoToken = 'LINK-DEMO' + Math.floor(1000 + Math.random() * 9000)
      setActiveToken({
        token: demoToken,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      setActionLoading(false)
      return
    }

    try {
      // Hapus token lama user yang belum terpakai
      await supabase.from('telegram_link_tokens').delete().eq('user_id', user.id)

      // Buat token unik acak (contoh: LINK-8B3K9A)
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
      const token = `LINK-${randomStr}`
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('telegram_link_tokens')
        .insert([
          {
            user_id: user.id,
            token,
            expires_at: expiresAt,
            is_used: false,
          },
        ])
        .select()
        .single()

      if (error) {
        if (
          error.message.includes('relation "public.telegram_link_tokens" does not exist') ||
          error.message.includes('telegram_link_tokens') ||
          error.message.includes('schema cache')
        ) {
          throw new Error(
            'Tabel telegram_link_tokens belum dibuat di database Supabase Anda. Silakan buka Supabase Dashboard -> menu SQL Editor, lalu jalankan file `supabase/migrations_multiuser_and_budget.sql`.'
          )
        }
        throw error
      }

      setActiveToken(data)
    } catch (err) {
      setErrorMsg(err.message || 'Gagal membuat kode token.')
    } finally {
      setActionLoading(false)
    }
  }

  // 3. Putuskan Hubungan (Unlink)
  const handleUnlink = async () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin memutuskan hubungan akun Telegram dari akun CatatDuit ini? Bot tidak akan lagi mencatat transaksi dari Telegram Anda.'
    )
    if (!confirm) return

    setActionLoading(true)
    setErrorMsg('')

    if (isDemoMode) {
      setBinding(null)
      setActionLoading(false)
      setSuccessMsg('Hubungan Telegram berhasil diputuskan (Mode Demo).')
      return
    }

    try {
      const { error } = await supabase
        .from('telegram_bindings')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setBinding(null)
      setActiveToken(null)
      setSuccessMsg('Koneksi Telegram berhasil diputuskan.')
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memutuskan hubungan Telegram.')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  const botUsername = 'CatetttBot'
  const telegramBotLink = activeToken
    ? `https://t.me/${botUsername}?start=${activeToken.token}`
    : `https://t.me/${botUsername}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-sky-50/50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Integrasi Bot Telegram</h3>
              <p className="text-xs text-slate-500">Hubungkan bot Telegram ke akun pribadi Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer border border-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-sky-500" />
              <span className="text-xs font-semibold">Memeriksa status koneksi Telegram...</span>
            </div>
          ) : binding ? (
            /* TAMPILAN JIKA SUDAH TERHUBUNG */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900">
                <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Akun Telegram Anda Berhasil Terhubung!</span>
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                  Setiap transaksi yang Anda kirim ke bot <strong>@{botUsername}</strong> akan otomatis dicatat khusus ke akun email Anda (<strong>{user?.email}</strong>).
                </p>

                <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/60 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Telegram:</span>
                    <span className="font-semibold text-slate-800">{binding.first_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Username:</span>
                    <span className="font-semibold text-slate-800">
                      {binding.telegram_username ? `@${binding.telegram_username}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telegram Chat ID:</span>
                    <span className="font-mono text-slate-600">{binding.telegram_chat_id}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-2">
                <span className="font-bold text-slate-800 block">💡 Tips Penggunaan Bot:</span>
                <p>Kirim pesan ke bot Telegram kapan saja dengan format bebas:</p>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                  <div>• Belanja bulanan 500000</div>
                  <div>• Beli bensin 25rb</div>
                  <div>• Makan siang padang 30k</div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Buka Chat Bot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleUnlink}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5" />
                  )}
                  <span>Putuskan Hubungan</span>
                </button>
              </div>
            </div>
          ) : (
            /* TAMPILAN JIKA BELUM TERHUBUNG */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-sky-900 leading-relaxed">
                  <p className="font-bold mb-0.5">Keamanan Akun Multi-User</p>
                  <p className="text-sky-700">
                    Sistem menggunakan token sekali pakai yang aman. Akun Telegram Anda hanya akan terhubung ke email <strong>{user?.email}</strong> dan transaksi Anda tidak akan pernah bercampur dengan user lain.
                  </p>
                </div>
              </div>

              {!activeToken ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-inner">
                    <Send className="w-8 h-8 ml-0.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Belum Ada Telegram yang Terhubung</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Klik tombol di bawah untuk membuat kode token sekali pakai yang berlaku selama 15 menit.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateToken}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Buat Kode Penghubung Telegram</span>
                  </button>
                </div>
              ) : (
                /* TAMPILAN TOKEN AKTIF */
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-5 bg-slate-900 text-white rounded-2xl text-center space-y-3 shadow-lg">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Berlaku selama 15 menit</span>
                    </div>

                    <div className="py-2 px-4 bg-slate-800 rounded-xl inline-block border border-slate-700">
                      <span className="font-mono text-2xl font-black tracking-widest text-emerald-400">
                        {activeToken.token}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => copyToClipboard(activeToken.token)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Token</span>
                          </>
                        )}
                      </button>

                      <a
                        href={telegramBotLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-lg transition shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Otomatis ke Bot</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Langkah-langkah */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
                    <span className="font-bold text-slate-900 block">Langkah Menghubungkan:</span>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                      <li>
                        Klik tombol <strong>&ldquo;Kirim Otomatis ke Bot&rdquo;</strong> di atas, atau buka Telegram dan cari bot <strong>@{botUsername}</strong>.
                      </li>
                      <li>
                        Ketik pesan: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">/connect {activeToken.token}</code> atau langsung kirim kode token di atas ke bot.
                      </li>
                      <li>
                        Bot akan membalas konfirmasi sukses dan jendela ini akan otomatis terhubung!
                      </li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>Menunggu konfirmasi dari Telegram...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
