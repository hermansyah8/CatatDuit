import { useState } from 'react'
import {
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  MessageSquare,
  Globe,
  Loader2,
} from 'lucide-react'
import { formatRupiah, formatDateIndo } from '../utils/formatters'
import { getCategoryMeta } from '../utils/categories'

export default function TransactionList({ transactions, onEdit, onDelete, loading }) {
  const [deletingId, setDeletingId] = useState(null)

  const handleDeleteClick = async (transaction) => {
    const konfirmasi = window.confirm(
      `Apakah Anda yakin ingin menghapus transaksi "${transaction.description || transaction.category}" senilai ${formatRupiah(transaction.amount)}?`
    )
    if (!konfirmasi) return

    setDeletingId(transaction.id)
    try {
      await onDelete(transaction.id)
    } finally {
      setDeletingId(null)
    }
  }

  // Helper untuk menampilkan badge sumber input (Manual vs WhatsApp vs Telegram)
  const renderSourceBadge = (source) => {
    if (source === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
          <MessageSquare className="w-2.5 h-2.5" />
          WhatsApp
        </span>
      )
    }
    if (source === 'telegram') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <MessageSquare className="w-2.5 h-2.5" />
          Telegram
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
        <Globe className="w-2.5 h-2.5" />
        Web Manual
      </span>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header List */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Riwayat Transaksi</h3>
          <p className="text-xs text-slate-500">
            Daftar seluruh aktivitas keuangan sesuai filter yang dipilih
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
          {transactions.length} Transaksi
        </span>
      </div>

      {/* Konten Transaksi */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Memuat data transaksi...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-1">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700">Belum ada transaksi</p>
          <p className="text-xs text-slate-400 max-w-sm">
            Klik tombol &ldquo;Tambah Transaksi&rdquo; di atas untuk mencatat pemasukan atau pengeluaran pertama Anda.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const isIncome = tx.type === 'income'
            const categoryMeta = getCategoryMeta(tx.category, tx.type)
            const isDeleting = deletingId === tx.id

            return (
              <div
                key={tx.id}
                className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Kolom Kiri: Ikon Tipe, Deskripsi, Kategori & Tanggal */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {tx.description || tx.category}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${categoryMeta.bg}`}
                      >
                        {categoryMeta.label}
                      </span>
                      {renderSourceBadge(tx.source)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDateIndo(tx.transaction_date)}
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan: Nominal & Tombol Aksi */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pl-13 sm:pl-0">
                  <div className="text-right">
                    <div
                      className={`text-sm sm:text-base font-black tracking-tight ${
                        isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Tombol Edit */}
                    <button
                      onClick={() => onEdit(tx)}
                      title="Edit transaksi"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Tombol Hapus */}
                    <button
                      onClick={() => handleDeleteClick(tx)}
                      disabled={isDeleting}
                      title="Hapus transaksi"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
