export const EXPENSE_CATEGORIES = [
  { id: 'Belanja Bulanan', label: 'Belanja Bulanan', color: '#ec4899', bg: 'bg-pink-50 text-pink-600' },
  { id: 'Susu Kotak', label: 'Susu Kotak', color: '#0ea5e9', bg: 'bg-sky-50 text-sky-600' },
  { id: 'Kontrakan', label: 'Kontrakan', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-600' },
  { id: 'Makan Diluar', label: 'Makan Diluar', color: '#f97316', bg: 'bg-orange-50 text-orange-600' },
  { id: 'Wifi', label: 'Wifi', color: '#06b6d4', bg: 'bg-cyan-50 text-cyan-600' },
  { id: 'Pampers', label: 'Pampers', color: '#f43f5e', bg: 'bg-rose-50 text-rose-600' },
  { id: 'Sampah', label: 'Sampah', color: '#78716c', bg: 'bg-stone-50 text-stone-600' },
  { id: 'Ibu', label: 'Ibu', color: '#d946ef', bg: 'bg-fuchsia-50 text-fuchsia-600' },
  { id: 'Bantu Kuliah om ndut', label: 'Bantu Kuliah om ndut', color: '#3b82f6', bg: 'bg-blue-50 text-blue-600' },
  { id: 'nenda+abah', label: 'Nenda + Abah', color: '#a855f7', bg: 'bg-purple-50 text-purple-600' },
  { id: 'Papah', label: 'Papah', color: '#8b5cf6', bg: 'bg-violet-50 text-violet-600' },
  { id: 'Gas dan Galon', label: 'Gas dan Galon', color: '#14b8a6', bg: 'bg-teal-50 text-teal-600' },
  { id: 'Listrik', label: 'Listrik', color: '#eab308', bg: 'bg-yellow-50 text-yellow-700' },
  { id: 'Seanna', label: 'Seanna', color: '#fb7185', bg: 'bg-rose-50 text-rose-600' },
  { id: 'telor', label: 'Telor', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700' },
  { id: 'Belanja Sayur', label: 'Belanja Sayur', color: '#10b981', bg: 'bg-emerald-50 text-emerald-600' },
  { id: 'sawah', label: 'Sawah', color: '#84cc16', bg: 'bg-lime-50 text-lime-700' },
  { id: 'Qurban', label: 'Qurban', color: '#059669', bg: 'bg-emerald-50 text-emerald-700' },
  { id: 'nabung', label: 'Nabung', color: '#2563eb', bg: 'bg-blue-50 text-blue-700' },
  { id: 'DLL', label: 'DLL', color: '#64748b', bg: 'bg-slate-100 text-slate-600' },
  { id: 'Makanan', label: 'Makanan & Minuman', color: '#f97316', bg: 'bg-orange-50 text-orange-600' },
  { id: 'Transportasi', label: 'Transportasi', color: '#0ea5e9', bg: 'bg-sky-50 text-sky-600' },
  { id: 'Tagihan', label: 'Tagihan & Utilitas', color: '#eab308', bg: 'bg-yellow-50 text-yellow-700' },
  { id: 'Hiburan', label: 'Hiburan', color: '#8b5cf6', bg: 'bg-purple-50 text-purple-600' },
  { id: 'Kesehatan', label: 'Kesehatan', color: '#10b981', bg: 'bg-emerald-50 text-emerald-600' },
  { id: 'Lainnya', label: 'Pengeluaran Lainnya', color: '#64748b', bg: 'bg-slate-100 text-slate-600' },
]

export const INCOME_CATEGORIES = [
  { id: 'Gaji', label: 'Gaji Pokok', color: '#10b981', bg: 'bg-emerald-50 text-emerald-600' },
  { id: 'Bonus', label: 'Bonus / THR', color: '#14b8a6', bg: 'bg-teal-50 text-teal-600' },
  { id: 'Bisnis', label: 'Hasil Usaha / Bisnis', color: '#3b82f6', bg: 'bg-blue-50 text-blue-600' },
  { id: 'Investasi', label: 'Dividen / Investasi', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-600' },
  { id: 'Hadiah', label: 'Hadiah / Pemberian', color: '#f43f5e', bg: 'bg-rose-50 text-rose-600' },
  { id: 'Lainnya', label: 'Pemasukan Lainnya', color: '#64748b', bg: 'bg-slate-100 text-slate-600' },
]

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

/**
 * Normalisasi nama kategori (mengabaikan huruf besar/kecil, underscore, spasi berlebih, tanda plus/minus)
 * Contoh: "nenda+abah" -> "nenda abah", "Nenda + Abah" -> "nenda abah", "  Susu Kotak " -> "susu kotak"
 */
export const normalizeCategory = (cat) => {
  return (cat || '')
    .toLowerCase()
    .replace(/[_\s\-\+\/\&]+/g, ' ')
    .trim()
}

/**
 * Memeriksa apakah dua kategori cocok (fleksibel)
 * Mendukung pencocokan:
 * - Persis atau case-insensitive
 * - "nenda" atau "abah" cocok dengan "nenda+abah" / "Nenda + Abah"
 * - Pencocokan parsial kata kunci seperti "belanja" cocok dengan "belanja bulanan"
 */
export const isCategoryMatch = (catA, catB) => {
  const normA = normalizeCategory(catA)
  const normB = normalizeCategory(catB)
  if (!normA || !normB) return false
  if (normA === normB) return true

  // Aturan khusus: nenda / abah / nenda abah saling cocok
  const isNendaAbahA = normA === 'nenda abah' || normA === 'nenda' || normA === 'abah'
  const isNendaAbahB = normB === 'nenda abah' || normB === 'nenda' || normB === 'abah'
  if (isNendaAbahA && isNendaAbahB) return true

  // Cek apakah salah satu kata utuh cocok
  const wordsA = normA.split(' ').filter(Boolean)
  const wordsB = normB.split(' ').filter(Boolean)
  if (wordsA.length === 1 && wordsB.includes(wordsA[0])) return true
  if (wordsB.length === 1 && wordsA.includes(wordsB[0])) return true

  if (normA.startsWith(normB) || normB.startsWith(normA)) return true
  return false
}

export const getCategoryMeta = (categoryId, type = 'expense') => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const found = list.find(
    (c) => isCategoryMatch(c.id, categoryId) || isCategoryMatch(c.label, categoryId)
  )
  if (found) return found
  return {
    id: categoryId,
    label: (categoryId || '').replace(/_/g, ' '),
    color: '#64748b',
    bg: 'bg-slate-100 text-slate-600',
  }
}

