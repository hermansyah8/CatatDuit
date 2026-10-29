import { Wallet, LogOut, User, Send, FileSpreadsheet } from 'lucide-react'

export default function Navbar({
  user,
  onLogout,
  onOpenTelegram,
  isTelegramConnected,
  onOpenReport,
}) {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Judul Aplikasi */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              Catat<span className="text-emerald-600">Duit</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Pengeluaran & Pemasukan</p>
          </div>
        </div>

        {/* User Info & Tombol Aksi */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Tombol Laporan Bulanan */}
            {onOpenReport && (
              <button
                onClick={onOpenReport}
                title="Buka & Download Laporan Pengeluaran Bulanan (PDF)"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Laporan Bulanan</span>
                <span className="sm:hidden">Laporan</span>
              </button>
            )}

            {/* Tombol Hubungkan / Status Telegram */}
            <button
              onClick={onOpenTelegram}
              title={isTelegramConnected ? 'Telegram terhubung - Klik untuk rincian' : 'Hubungkan Telegram untuk mencatat via chat'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isTelegramConnected
                  ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:text-sky-600 shadow-xs'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden md:inline">
                {isTelegramConnected ? 'Telegram Terhubung' : 'Hubungkan Telegram'}
              </span>
              <span className="md:hidden">Telegram</span>
              {isTelegramConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700 max-w-[160px] truncate">
                {user.email}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Keluar dari akun"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

