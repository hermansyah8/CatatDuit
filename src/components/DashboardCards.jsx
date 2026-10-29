import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatRupiah, formatMonthYear } from '../utils/formatters'

export default function DashboardCards({ totalIncome, totalExpense, balance, selectedMonth }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
        <h2 className="text-lg font-bold text-slate-800">Ringkasan Keuangan</h2>
        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 self-start sm:self-auto">
          Periode: {selectedMonth ? formatMonthYear(selectedMonth) : 'Semua Waktu'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Pemasukan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pemasukan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {formatRupiah(totalIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Uang yang masuk ke rekening/dompet</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-50 rounded-full opacity-40 pointer-events-none" />
        </div>

        {/* Card Pengeluaran */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pengeluaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total biaya yang dibelanjakan</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-rose-50 rounded-full opacity-40 pointer-events-none" />
        </div>

        {/* Card Sisa Saldo */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sisa Saldo
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                balance >= 0 ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              balance >= 0 ? 'text-sky-600' : 'text-amber-600'
            }`}
          >
            {formatRupiah(balance)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {balance >= 0 ? 'Surplus / Sisa dana aman' : 'Defisit (Pengeluaran > Pemasukan)'}
          </p>
          <div
            className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-40 pointer-events-none ${
              balance >= 0 ? 'bg-sky-50' : 'bg-amber-50'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
