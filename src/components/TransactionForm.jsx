import { useState, useEffect } from 'react'
import { PlusCircle, X, Check, ArrowUpRight, ArrowDownRight, Loader2, Globe, MessageSquare } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils/categories'

export default function TransactionForm({ isOpen, onClose, onSave, editData }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState('')
  const [source, setSource] = useState('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sinkronkan state saat form dibuka atau editData berubah
  useEffect(() => {
    if (editData) {
      setType(editData.type || 'expense')
      setAmount(editData.amount ? String(editData.amount) : '')
      setCategory(editData.category || '')
      setDescription(editData.description || '')
      setTransactionDate(editData.transaction_date || new Date().toISOString().split('T')[0])
      setSource(editData.source || 'manual')
    } else {
      setType('expense')
      setAmount('')
      setCategory(EXPENSE_CATEGORIES[0].id)
      setDescription('')
      setTransactionDate(new Date().toISOString().split('T')[0])
      setSource('manual')
    }
    setError('')
  }, [editData, isOpen])

  // Update default category when type toggles (if current category does not match list)
  const handleTypeChange = (newType) => {
    setType(newType)
    const list = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setCategory(list[0].id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal harus berupa angka lebih besar dari 0.')
      return
    }

    if (!category) {
      setError('Silakan pilih kategori transaksi.')
      return
    }

    if (!transactionDate) {
      setError('Silakan pilih tanggal transaksi.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        id: editData?.id,
        type,
        amount: parsedAmount,
        category,
        description: description.trim() || category,
        transaction_date: transactionDate,
        source: source || 'manual',
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan transaksi.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editData ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
            </h3>
            <p className="text-xs text-slate-500">
              {editData ? 'Perbarui informasi transaksi terpilih' : 'Catat pemasukan atau pengeluaran Anda'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable if screen is small) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Toggle Pemasukan / Pengeluaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Pemasukan
              </button>
            </div>
          </div>

          {/* Nominal (Amount) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Nominal (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 20000"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            {amount && !isNaN(Number(amount)) && (
              <p className="text-[11px] text-slate-400 mt-1">
                Terbaca: Rp {Number(amount).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Kategori *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Tanggal Transaksi *
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
            />
          </div>

          {/* Deskripsi / Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Deskripsi / Keterangan
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Cilok, Bensin, Gaji Bulanan..."
              maxLength={150}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Sumber Input (Simulasi Integrasi Bot WA / Telegram) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Sumber Input Transaksi</span>
              <span className="text-[10px] text-emerald-600 font-normal">Siap untuk Bot WhatsApp / Telegram</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSource('manual')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  source === 'manual'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('whatsapp')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  source === 'whatsapp'
                    ? 'bg-green-600 text-white shadow-xs shadow-green-600/30'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setSource('telegram')}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                  source === 'telegram'
                    ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </button>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  <span>{editData ? 'Simpan Perubahan' : 'Tambah Transaksi'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
