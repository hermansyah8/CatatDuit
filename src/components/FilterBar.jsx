import { Filter, Calendar, Tag, RotateCcw } from 'lucide-react'
import { ALL_CATEGORIES } from '../utils/categories'

export default function FilterBar({
  selectedMonth,
  onMonthChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  onResetFilters,
}) {
  const isFiltered = Boolean(selectedCategory || selectedType)

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Judul Filter */}
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filter Transaksi</span>
        </div>

        {/* Input Kontrol Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-2xl">
          {/* Filter Bulan */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              title="Pilih Bulan Transaksi"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            />
          </div>

          {/* Filter Tipe Transaksi */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            >
              <option value="">Semua Tipe (Pemasukan & Pengeluaran)</option>
              <option value="expense">Hanya Pengeluaran</option>
              <option value="income">Hanya Pemasukan</option>
            </select>
          </div>

          {/* Filter Kategori */}
          <div className="relative">
            <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {/* Ambil kategori unik */}
              {Array.from(new Set(ALL_CATEGORIES.map((c) => c.id))).map((catId) => (
                <option key={catId} value={catId}>
                  {catId}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tombol Reset Filter */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  )
}
