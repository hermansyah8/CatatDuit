import { useState, useMemo } from 'react'
import {
  Target,
  PlusCircle,
  Edit2,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatRupiah, formatMonthYear } from '../utils/formatters'
import { getCategoryMeta, isCategoryMatch } from '../utils/categories'

export default function BudgetDashboard({
  budgets,
  transactions,
  selectedMonth,
  onOpenAddBudget,
  onEditBudget,
  onQuickSeedBudgets,
}) {
  // State untuk Expand / Collapse Rincian Kategori (default collapsed agar tidak perlu scroll jauh)
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('catatduit_budgets_expanded')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem('catatduit_budgets_expanded', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }
  // Kalkulasi Ringkasan Seluruh Anggaran & Realisasi Terpakai Real-Time
  const {
    totalAnggaran,
    totalTerpakai,
    totalSisa,
    overallPercent,
    overCount,
    warningCount,
    budgetItems,
  } = useMemo(() => {
    let sumAnggaran = 0
    let sumTerpakai = 0

    const items = budgets.map((b) => {
      const anggaran = Number(b.amount || 0)

      // Hitung pengeluaran aktual bulan ini yang cocok dengan kategori anggaran (fleksibel)
      const terpakai = transactions.reduce((sum, tx) => {
        if (
          tx.type === 'expense' &&
          tx.transaction_date?.startsWith(selectedMonth) &&
          isCategoryMatch(tx.category, b.category)
        ) {
          return sum + Number(tx.amount || 0)
        }
        return sum
      }, 0)

      const sisa = anggaran - terpakai
      const percent = anggaran > 0 ? (terpakai / anggaran) * 100 : 0

      sumAnggaran += anggaran
      sumTerpakai += terpakai

      let status = 'safe' // 'safe' | 'warning' | 'over'
      if (sisa < 0) {
        status = 'over'
      } else if (percent >= 80) {
        status = 'warning'
      }

      return {
        ...b,
        anggaran,
        terpakai,
        sisa,
        percent,
        status,
        meta: getCategoryMeta(b.category, 'expense'),
      }
    })

    const sumSisa = sumAnggaran - sumTerpakai
    const overall = sumAnggaran > 0 ? (sumTerpakai / sumAnggaran) * 100 : 0
    const overCount = items.filter((i) => i.status === 'over').length
    const warningCount = items.filter((i) => i.status === 'warning').length

    return {
      totalAnggaran: sumAnggaran,
      totalTerpakai: sumTerpakai,
      totalSisa: sumSisa,
      overallPercent: overall,
      overCount,
      warningCount,
      budgetItems: items,
    }
  }, [budgets, transactions, selectedMonth])

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 mb-8">
      {/* Header Bagian Anggaran */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Penjatahan Anggaran Bulanan
            </h2>
            <p className="text-xs text-slate-500">
              Pantau batas penggunaan dana per kategori periode {formatMonthYear(selectedMonth)}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddBudget}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          <span>Tambah Anggaran Kategori</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
            <PieChart className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Belum Ada Anggaran untuk {formatMonthYear(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Buat penjatahan kategori (misal: Belanja Bulanan, Transportasi, Makan) agar bot Telegram dapat memantau sisa kuota belanja Anda secara otomatis.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={onOpenAddBudget}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              + Buat Anggaran Pertama
            </button>
            {onQuickSeedBudgets && (
              <button
                onClick={onQuickSeedBudgets}
                title="Buat paket rekomendasi: Belanja Bulanan, Transportasi, Makan, Hiburan"
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Paket Contoh Otomatis</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Budget Dashboard Content */
        <div className="space-y-6 pt-5">
          {/* Kartu Ringkasan Total Anggaran */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
            {/* Total Plafon Anggaran */}
            <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Anggaran Bulan Ini
              </span>
              <span className="text-lg font-black text-slate-800">
                {formatRupiah(totalAnggaran)}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {budgets.length} Kategori Dibatasi
              </div>
            </div>

            {/* Total Terpakai */}
            <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Terpakai
              </span>
              <span className="text-lg font-black text-rose-600">
                {formatRupiah(totalTerpakai)}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {overallPercent.toFixed(1)}% dari total anggaran
              </div>
            </div>

            {/* Total Sisa Anggaran */}
            <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Sisa Kuota
              </span>
              <span
                className={`text-lg font-black ${
                  totalSisa >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {totalSisa < 0 ? '-' : ''} {formatRupiah(Math.abs(totalSisa))}
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {totalSisa >= 0 ? 'Sisa dana anggaran aman' : 'Melebihi total batas anggaran'}
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
              <span className="text-slate-600">Realisasi Penggunaan Anggaran Keseluruhan</span>
              <span
                className={
                  overallPercent > 100
                    ? 'text-rose-600 font-bold'
                    : overallPercent >= 80
                    ? 'text-amber-600 font-bold'
                    : 'text-emerald-600 font-bold'
                }
              >
                {overallPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallPercent > 100
                    ? 'bg-rose-500'
                    : overallPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(overallPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Section Rincian Batas per Kategori dengan Fitur Expand / Collapse */}
          <div className="pt-1">
            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between p-3.5 sm:px-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rincian Batas per Kategori
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/90 text-slate-700">
                  {budgetItems.length} Kategori
                </span>
                {overCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" />
                    {overCount} Overbudget
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {warningCount} Kritis
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-800 transition">
                <span>{isExpanded ? 'Sembunyikan' : 'Buka Rincian'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                )}
              </div>
            </button>

            {/* Konten Grid Kategori (Muncul saat Expand) */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4 animate-in fade-in duration-200">
                {budgetItems.map((item) => {
                  const isOver = item.status === 'over'
                  const isWarning = item.status === 'warning'

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isOver
                          ? 'bg-rose-50/40 border-rose-200'
                          : isWarning
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Nama Kategori & Action Edit */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.meta.color || '#10b981' }}
                          />
                          <span className="font-bold text-sm text-slate-900">{item.category}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                              <AlertOctagon className="w-3 h-3" />
                              Overbudget
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              Kritis ({item.percent.toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Aman
                            </span>
                          )}

                          <button
                            onClick={() => onEditBudget(item)}
                            title="Ubah nominal kuota"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer ml-1"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar Kategori */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(item.percent, 100)}%` }}
                        />
                      </div>

                      {/* Grid Detail Nilai */}
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100/60">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Anggaran</span>
                          <span className="font-bold text-slate-700">
                            {formatRupiah(item.anggaran)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Terpakai</span>
                          <span className="font-bold text-slate-900">
                            {formatRupiah(item.terpakai)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Sisa Kuota</span>
                          <span
                            className={`font-black ${
                              item.sisa >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {item.sisa < 0 ? '-' : ''}
                            {formatRupiah(Math.abs(item.sisa))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
