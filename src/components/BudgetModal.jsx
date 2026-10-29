import { useState, useEffect } from 'react'
import { X, Check, Trash2, Loader2, Target, DollarSign, Calendar } from 'lucide-react'
import { EXPENSE_CATEGORIES } from '../utils/categories'
import { formatRupiah } from '../utils/formatters'

export default function BudgetModal({ isOpen, onClose, onSave, onDelete, editBudget, currentMonth }) {
  const [category, setCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [amount, setAmount] = useState('')
  const [yearMonth, setYearMonth] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editBudget) {
      const isPredefined = EXPENSE_CATEGORIES.some(
        (c) => c.id.toLowerCase() === (editBudget.category || '').toLowerCase()
      )
      if (isPredefined) {
        setCategory(editBudget.category)
        setIsCustomCategory(false)
        setCustomCategoryName('')
      } else {
        setCategory('__custom__')
        setIsCustomCategory(true)
        setCustomCategoryName(editBudget.category)
      }
      setAmount(String(editBudget.amount || ''))
      setYearMonth(editBudget.year_month || currentMonth)
    } else {
      setCategory(EXPENSE_CATEGORIES[0].id)
      setIsCustomCategory(false)
      setCustomCategoryName('')
      setAmount('')
      setYearMonth(currentMonth || new Date().toISOString().slice(0, 7))
    }
    setError('')
  }, [editBudget, isOpen, currentMonth])

  const handleCategorySelectChange = (e) => {
    const val = e.target.value
    if (val === '__custom__') {
      setIsCustomCategory(true)
      setCategory('__custom__')
    } else {
      setIsCustomCategory(false)
      setCategory(val)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const finalCategory = isCustomCategory ? customCategoryName.trim() : category
    if (!finalCategory) {
      setError('Silakan tentukan nama kategori anggaran.')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal anggaran harus berupa angka lebih besar dari 0.')
      return
    }

    if (!yearMonth) {
      setError('Silakan pilih periode bulan dan tahun.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        id: editBudget?.id,
        category: finalCategory,
        amount: parsedAmount,
        year_month: yearMonth,
      })
      onClose()
    } catch (err) {
      if (
        err.message?.includes('category_budgets') &&
        (err.message?.includes('schema cache') || err.message?.includes('does not exist'))
      ) {
        setError(
          'Tabel database `category_budgets` belum dibuat di Supabase. Silakan buka Supabase Dashboard -> menu SQL Editor, lalu jalankan file `supabase/migrations_multiuser_and_budget.sql`.'
        )
      } else if (err.message?.includes('uq_category_budgets')) {
        setError(`Anggaran untuk kategori "${finalCategory}" pada periode ${yearMonth} sudah pernah dibuat. Anda dapat mengedit anggaran yang sudah ada.`)
      } else {
        setError(err.message || 'Gagal menyimpan anggaran.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editBudget?.id) return
    const confirm = window.confirm(`Hapus kuota anggaran untuk kategori "${editBudget.category}"?`)
    if (!confirm) return

    setLoading(true)
    try {
      await onDelete(editBudget.id)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menghapus anggaran.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editBudget ? 'Edit Penjatahan Anggaran' : 'Atur Anggaran Kategori'}
              </h3>
              <p className="text-xs text-slate-500">Tentukan batas kuota pengeluaran bulanan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer border border-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Periode Bulan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Periode Anggaran (Bulan) *</span>
            </label>
            <input
              type="month"
              required
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            />
          </div>

          {/* Pilihan Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Kategori Pengeluaran *
            </label>
            <select
              value={isCustomCategory ? '__custom__' : category}
              onChange={handleCategorySelectChange}
              disabled={Boolean(editBudget)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer disabled:bg-slate-100"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.id})
                </option>
              ))}
              <option value="__custom__">+ Kategori Khusus (Ketik Sendiri)...</option>
            </select>
            {editBudget && (
              <p className="text-[11px] text-slate-400 mt-1">
                Kategori tidak dapat diubah pada mode edit. Hapus dan buat baru jika ingin mengganti kategori.
              </p>
            )}
          </div>

          {/* Jika Pilih Kategori Khusus */}
          {isCustomCategory && !editBudget && (
            <div className="animate-in fade-in">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nama Kategori Khusus *
              </label>
              <input
                type="text"
                required
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                placeholder="Contoh: Belanja Bulanan, Kuliah, Hewan Peliharaan"
                maxLength={50}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          )}

          {/* Nominal Anggaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Nominal Anggaran (Rp) *</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="1000"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 600000"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            {amount && !isNaN(Number(amount)) && (
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Plafon Kuota: {formatRupiah(Number(amount))}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {editBudget ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editBudget ? 'Perbarui Anggaran' : 'Simpan Anggaran'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
