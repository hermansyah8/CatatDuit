import { PieChart, AlertCircle } from 'lucide-react'
import { formatRupiah } from '../utils/formatters'
import { getCategoryMeta } from '../utils/categories'

export default function CategoryChart({ transactions }) {
  // Hanya ambil transaksi bertipe 'expense' (pengeluaran)
  const expenses = transactions.filter((t) => t.type === 'expense')
  const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

  // Kelompokkan total pengeluaran per kategori
  const categoryTotals = expenses.reduce((acc, curr) => {
    const cat = curr.category || 'Lainnya'
    acc[cat] = (acc[cat] || 0) + Number(curr.amount || 0)
    return acc
  }, {})

  // Ubah ke array dan urutkan dari pengeluaran terbesar
  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => {
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
      const meta = getCategoryMeta(category, 'expense')
      return {
        category,
        amount,
        percentage,
        color: meta.color,
        label: meta.label,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // Perhitungan SVG Donut Chart
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let accumulatedOffset = 0

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Grafik Pengeluaran per Kategori</h3>
            <p className="text-xs text-slate-500">Distribusi pengeluaran berdasarkan pos belanja</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
          Total: {formatRupiah(totalExpense)}
        </span>
      </div>

      {sortedCategories.length === 0 ? (
        <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <p className="text-sm font-medium">Belum ada pengeluaran pada periode ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Donut Chart SVG */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />
                {/* Segment Rings */}
                {sortedCategories.map((item) => {
                  const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`
                  const strokeDashoffset = -accumulatedOffset
                  accumulatedOffset += (item.percentage / 100) * circumference

                  return (
                    <circle
                      key={item.category}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="16"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="butt"
                      className="transition-all duration-500 hover:opacity-85"
                    />
                  )
                })}
              </svg>

              {/* Teks di tengah Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total
                </span>
                <span className="text-sm font-black text-slate-800 px-2 truncate max-w-[120px]">
                  {formatRupiah(totalExpense)}
                </span>
              </div>
            </div>
          </div>

          {/* List Breakdown Rincian Kategori */}
          <div className="md:col-span-7 space-y-3.5">
            {sortedCategories.map((item) => (
              <div key={item.category} className="group">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold">{formatRupiah(item.amount)}</span>
                    <span className="text-slate-400 w-12 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar Persentase */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
