/**
 * Format angka menjadi format Rupiah Indonesia (contoh: Rp 5.000 atau Rp 9.000.000)
 */
export const formatRupiah = (number) => {
  if (number === null || number === undefined || isNaN(number)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number)
}

/**
 * Format tanggal YYYY-MM-DD menjadi format tanggal Indonesia (contoh: 19 Oktober 2026)
 */
export const formatDateIndo = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

/**
 * Mengubah string YYYY-MM menjadi nama bulan bahasa Indonesia (contoh: "2026-10" -> "Oktober 2026")
 */
export const formatMonthYear = (yearMonth) => {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Mengubah string YYYY-MM menjadi nama bulan saja dalam bahasa Indonesia (contoh: "2026-10" -> "Oktober")
 */
export const getMonthNameIndo = (yearMonth) => {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
  }).format(date)
}

/**
 * Mendapatkan bulan berjalan dalam format YYYY-MM (contoh: "2026-10")
 */
export const getCurrentYearMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

