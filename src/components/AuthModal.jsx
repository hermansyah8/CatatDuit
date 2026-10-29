import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogIn, UserPlus, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function AuthModal({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessNotice('')

    if (!email || !password) {
      setErrorMessage('Harap isi email dan kata sandi.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal harus 6 karakter.')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        // Registrasi Akun Baru
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        if (data.user && data.session) {
          // Berhasil langsung login (jika konfirmasi email dimatikan di Supabase)
          onAuthSuccess(data.user)
        } else {
          // Jika Supabase membutuhkan konfirmasi email
          setSuccessNotice(
            'Registrasi berhasil! Silakan cek kotak masuk email Anda untuk verifikasi, atau Anda dapat langsung mencoba masuk jika verifikasi email dimatikan.'
          )
        }
      } else {
        // Masuk (Login)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          onAuthSuccess(data.user)
        }
      }
    } catch (err) {
      // Terjemahkan pesan kesalahan Supabase ke bahasa Indonesia yang ramah pemula
      if (err.message.includes('Invalid login credentials')) {
        setErrorMessage('Email atau kata sandi tidak cocok. Silakan coba lagi.')
      } else if (err.message.includes('User already registered')) {
        setErrorMessage('Email ini sudah terdaftar. Silakan pilih tab Masuk.')
      } else if (err.message.includes('Email not confirmed')) {
        setErrorMessage('Email Anda belum dikonfirmasi. Cek link verifikasi di email Anda atau nonaktifkan Confirm Email di dashboard Supabase.')
      } else {
        setErrorMessage(err.message || 'Terjadi kesalahan saat otentikasi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isRegister ? 'Buat Akun Baru' : 'Masuk ke CatatDuit'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isRegister
              ? 'Daftar untuk mengamankan data transaksi keuangan Anda'
              : 'Kelola pemasukan dan pengeluaran bulanan Anda'}
          </p>
        </div>

        {/* Tab Toggle Masuk / Daftar */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false)
              setErrorMessage('')
              setSuccessNotice('')
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              !isRegister
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true)
              setErrorMessage('')
              setSuccessNotice('')
            }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              isRegister
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Notifikasi Error */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Notifikasi Sukses */}
        {successNotice && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm leading-relaxed">
            {successNotice}
          </div>
        )}

        {/* Form Auth */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : isRegister ? (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Daftar Sekarang</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Masuk ke Akun</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Data Anda diamankan dengan Row Level Security (RLS) PostgreSQL di Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
