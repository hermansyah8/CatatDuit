import { useState, useMemo, useEffect } from 'react'
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { formatRupiah, formatMonthYear, getMonthNameIndo } from '../utils/formatters'
import { getCategoryMeta, isCategoryMatch } from '../utils/categories'

export default function MonthlyReportModal({
  isOpen,
  onClose,
  user,
  selectedMonth: initialMonth,
  budgets: initialBudgets,
  transactions,
  isDemoMode,
}) {
  const [reportMonth, setReportMonth] = useState(initialMonth || '2026-10')
  const [monthBudgets, setMonthBudgets] = useState(initialBudgets || [])
  const [loadingBudgets, setLoadingBudgets] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState('')

  // Ambil anggaran untuk bulan yang dipilih jika berbeda dari initialBudgets
  useEffect(() => {
    if (!isOpen) return

    if (reportMonth === initialMonth && initialBudgets?.length > 0) {
      setMonthBudgets(initialBudgets)
      return
    }

    if (isDemoMode || !user || !supabase) {
      setMonthBudgets(initialBudgets || [])
      return
    }

    let isMounted = true
    setLoadingBudgets(true)

    supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', reportMonth)
      .order('amount', { ascending: false })
      .then(({ data, error }) => {
        if (!isMounted) return
        setLoadingBudgets(false)
        if (!error && data) {
          setMonthBudgets(data)
        } else {
          setMonthBudgets([])
        }
      })
      .catch(() => {
        if (isMounted) setLoadingBudgets(false)
      })

    return () => {
      isMounted = false
    }
  }, [reportMonth, isOpen, initialMonth, initialBudgets, user, isDemoMode])

  // Filter transaksi milik user dan periode bulan yang dipilih (Asia/Jakarta)
  const filteredTxs = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.transaction_date &&
        tx.transaction_date.startsWith(reportMonth)
    )
  }, [transactions, reportMonth])

  // Kalkulasi Rincian per Kategori & Ringkasan Keseluruhan
  const { reportItems, summary } = useMemo(() => {
    // 1. Kategori dari daftar anggaran bulan ini
    const budgetedItems = monthBudgets.map((b) => {
      const anggaran = Number(b.amount || 0)

      // Hitung pengeluaran aktual dari transaksi bulan ini yang cocok
      const terpakai = filteredTxs.reduce((sum, tx) => {
        if (isCategoryMatch(tx.category, b.category)) {
          return sum + Number(tx.amount || 0)
        }
        return sum
      }, 0)

      const sisa = anggaran - terpakai
      const percent = anggaran > 0 ? (terpakai / anggaran) * 100 : 0

      let status = 'tersisa' // 'tersisa' | 'habis' | 'over'
      let statusLabel = 'Tersisa'
      if (sisa < 0) {
        status = 'over'
        statusLabel = 'Melebihi Anggaran'
      } else if (sisa === 0) {
        status = 'habis'
        statusLabel = 'Habis'
      }

      const meta = getCategoryMeta(b.category, 'expense')

      return {
        id: b.id,
        category: b.category,
        label: meta.label || b.category,
        color: meta.color || '#10b981',
        anggaran,
        terpakai,
        sisa,
        percent,
        status,
        statusLabel,
      }
    })

    // 2. Kategori yang belum memiliki anggaran tapi memiliki transaksi
    const unbudgetedTxs = filteredTxs.filter(
      (tx) => !budgetedItems.some((b) => isCategoryMatch(b.category, tx.category))
    )

    // Kelompokkan unbudgeted transactions per kategori
    const unbudgetedMap = new Map()
    unbudgetedTxs.forEach((tx) => {
      const catKey = tx.category || 'Lainnya'
      const existing = unbudgetedMap.get(catKey) || 0
      unbudgetedMap.set(catKey, existing + Number(tx.amount || 0))
    })

    const unbudgetedItems = Array.from(unbudgetedMap.entries()).map(([cat, terpakai]) => {
      const meta = getCategoryMeta(cat, 'expense')
      return {
        id: 'unbudgeted-' + cat,
        category: cat,
        label: meta.label || cat,
        color: meta.color || '#64748b',
        anggaran: 0,
        terpakai,
        sisa: -terpakai,
        percent: 100,
        status: 'over',
        statusLabel: 'Melebihi Anggaran',
      }
    })

    const allItems = [...budgetedItems, ...unbudgetedItems]

    const sumAnggaran = allItems.reduce((acc, item) => acc + item.anggaran, 0)
    const sumTerpakai = allItems.reduce((acc, item) => acc + item.terpakai, 0)
    const sumSisa = sumAnggaran - sumTerpakai
    const overallPercent = sumAnggaran > 0 ? (sumTerpakai / sumAnggaran) * 100 : 0
    const overCount = allItems.filter((i) => i.status === 'over').length
    const habisCount = allItems.filter((i) => i.status === 'habis').length
    const tersisaCount = allItems.filter((i) => i.status === 'tersisa').length

    return {
      reportItems: allItems,
      summary: {
        totalAnggaran: sumAnggaran,
        totalTerpakai: sumTerpakai,
        totalSisa: sumSisa,
        overallPercent,
        overCount,
        habisCount,
        tersisaCount,
      },
    }
  }, [monthBudgets, filteredTxs])

  // Generator File PDF
  const handleDownloadPDF = () => {
    setIsDownloading(true)
    setDownloadSuccessMessage('')

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const [year] = reportMonth.split('-')
      const namaBulan = getMonthNameIndo(reportMonth)
      const userIdentifier = user?.email || user?.user_metadata?.full_name || 'Akun CatatDuit'

      const cetakStr = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(new Date())

      // 1. Header Banner & Branding
      doc.setFillColor(5, 150, 105) // emerald-600
      doc.rect(0, 0, 210, 5, 'F')

      // Logo Text
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42) // slate-900
      doc.text('Catat', 14, 16)
      doc.setTextColor(5, 150, 105) // emerald-600
      doc.text('Duit', 30, 16)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text('Sistem Pencatatan & Monitoring Anggaran Keuangan', 14, 21)

      // Judul Utama Laporan
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(15, 23, 42)
      doc.text('Laporan Pengeluaran Bulanan — Catat Duit', 14, 30)

      // Metadata Info
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(71, 85, 105)
      doc.text(`Identitas Akun : ${userIdentifier}`, 14, 36)
      doc.text(`Periode Laporan : ${formatMonthYear(reportMonth)}`, 14, 41)
      doc.text(`Waktu Cetak    : ${cetakStr} WIB`, 14, 46)

      // 2. Box Ringkasan Keseluruhan
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(14, 50, 182, 22, 2, 2, 'FD')

      // Ringkasan 1: Total Anggaran
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('TOTAL ANGGARAN', 18, 56)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(formatRupiah(summary.totalAnggaran), 18, 62)

      // Ringkasan 2: Total Pengeluaran
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('PENGELUARAN AKTUAL', 66, 56)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(225, 29, 72) // rose-600
      doc.text(formatRupiah(summary.totalTerpakai), 66, 62)

      // Ringkasan 3: Total Sisa Anggaran
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('TOTAL SISA ANGGARAN', 118, 56)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      if (summary.totalSisa >= 0) {
        doc.setTextColor(5, 150, 105)
        doc.text(formatRupiah(summary.totalSisa), 118, 62)
      } else {
        doc.setTextColor(225, 29, 72)
        doc.text(`-${formatRupiah(Math.abs(summary.totalSisa))}`, 118, 62)
      }

      // Ringkasan 4: Status Overbudget
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text('STATUS ANGGARAN', 162, 56)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      if (summary.overCount > 0) {
        doc.setTextColor(225, 29, 72)
        doc.text(`${summary.overCount} Overbudget`, 162, 62)
      } else {
        doc.setTextColor(5, 150, 105)
        doc.text('Terkendali', 162, 62)
      }

      // Sub-baris persentase
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Penggunaan Dana: ${summary.overallPercent.toFixed(1)}% | ${reportItems.length} Kategori Dipantau`,
        18,
        68
      )

      // 3. Tabel Data Rincian Kategori
      const tableRows = reportItems.map((item, index) => {
        let sisaStr = ''
        if (item.sisa > 0) {
          sisaStr = formatRupiah(item.sisa)
        } else if (item.sisa === 0) {
          sisaStr = 'Rp 0'
        } else {
          // Menampilkan nilai kelebihan secara jelas
          sisaStr = `-${formatRupiah(Math.abs(item.sisa))} (Lebih ${formatRupiah(Math.abs(item.sisa))})`
        }

        const percentStr = item.anggaran > 0 ? `${item.percent.toFixed(1)}%` : '-'

        return [
          String(index + 1),
          item.label,
          formatRupiah(item.anggaran),
          formatRupiah(item.terpakai),
          sisaStr,
          percentStr,
          item.statusLabel,
        ]
      })

      const footRow = [
        '',
        'Total Keseluruhan',
        formatRupiah(summary.totalAnggaran),
        formatRupiah(summary.totalTerpakai),
        summary.totalSisa >= 0
          ? formatRupiah(summary.totalSisa)
          : `-${formatRupiah(Math.abs(summary.totalSisa))}`,
        `${summary.overallPercent.toFixed(1)}%`,
        summary.overCount > 0 ? `${summary.overCount} Overbudget` : 'Aman',
      ]

      autoTable(doc, {
        startY: 76,
        margin: { left: 14, right: 14, bottom: 18 },
        head: [[
          'No',
          'Nama Kategori',
          'Anggaran Awal',
          'Pengeluaran Aktual',
          'Sisa Anggaran',
          'Penggunaan',
          'Status',
        ]],
        body: tableRows,
        foot: [footRow],
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          minCellHeight: 7,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          valign: 'middle',
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 8,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 42, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 40, halign: 'right' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const item = reportItems[data.row.index]
            if (!item) return

            // Warna kolom Sisa Anggaran
            if (data.column.index === 4) {
              if (item.sisa < 0) {
                data.cell.styles.textColor = [225, 29, 72]
                data.cell.styles.fontStyle = 'bold'
              } else if (item.sisa === 0) {
                data.cell.styles.textColor = [100, 116, 139]
              } else {
                data.cell.styles.textColor = [5, 150, 105]
              }
            }

            // Warna kolom Status
            if (data.column.index === 6) {
              if (item.status === 'over') {
                data.cell.styles.textColor = [225, 29, 72]
                data.cell.styles.fontStyle = 'bold'
              } else if (item.status === 'habis') {
                data.cell.styles.textColor = [217, 119, 6]
                data.cell.styles.fontStyle = 'bold'
              } else {
                data.cell.styles.textColor = [5, 150, 105]
                data.cell.styles.fontStyle = 'bold'
              }
            }
          }
        },
      })

      // 4. Nomor Halaman di Setiap Halaman
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(148, 163, 184)

        doc.setDrawColor(226, 232, 240)
        doc.line(14, 287, 196, 287)

        doc.text('CatatDuit — Sistem Pencatatan Keuangan Pribadi', 14, 292)
        doc.text(`Halaman ${i} dari ${totalPages}`, 196, 292, { align: 'right' })
      }

      // Format nama file konsisten: Laporan_Catat_Duit_Oktober_2026.pdf
      const fileName = `Laporan_Catat_Duit_${namaBulan}_${year}.pdf`
      doc.save(fileName)

      setDownloadSuccessMessage(`File ${fileName} berhasil diunduh!`)
    } catch (err) {
      console.error('Error saat membuat PDF:', err)
      alert('Terjadi kesalahan saat membuat file PDF: ' + err.message)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Laporan Pengeluaran Bulanan</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  PDF
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Download ringkasan anggaran, pengeluaran aktual, dan sisa kuota kategori
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Konten */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Baris Pemilihan Periode Bulan & Tahun */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">Pilih Periode Laporan:</span>
                <span className="text-[11px] text-slate-500">
                  Data diambil dari zona waktu Asia/Jakarta (WIB)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => {
                  if (e.target.value) setReportMonth(e.target.value)
                }}
                className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              />
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200/80">
                {formatMonthYear(reportMonth)}
              </span>
            </div>
          </div>

          {/* Notifikasi Download Berhasil */}
          {downloadSuccessMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{downloadSuccessMessage}</span>
            </div>
          )}

          {/* Kartu Ringkasan Keseluruhan (Preview) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Total Anggaran
              </span>
              <span className="text-base font-black text-slate-900 block truncate">
                {formatRupiah(summary.totalAnggaran)}
              </span>
              <span className="text-[10px] text-slate-500">{reportItems.length} Kategori</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Pengeluaran Aktual
              </span>
              <span className="text-base font-black text-rose-600 block truncate">
                {formatRupiah(summary.totalTerpakai)}
              </span>
              <span className="text-[10px] text-slate-500">{filteredTxs.length} Transaksi</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Sisa Anggaran
              </span>
              <span
                className={`text-base font-black block truncate ${
                  summary.totalSisa >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {summary.totalSisa < 0 ? '-' : ''}
                {formatRupiah(Math.abs(summary.totalSisa))}
              </span>
              <span className="text-[10px] text-slate-500">
                {summary.totalSisa >= 0 ? 'Kondisi surplus' : 'Defisit anggaran'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Status Anggaran
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {summary.overCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700">
                    <AlertOctagon className="w-3 h-3" />
                    {summary.overCount} Overbudget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Aman
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {summary.overallPercent.toFixed(1)}% Realisasi
              </span>
            </div>
          </div>

          {/* Progress Bar Penggunaan Keseluruhan */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Realisasi Penggunaan Dana Keseluruhan</span>
              <span
                className={
                  summary.overallPercent > 100
                    ? 'text-rose-600'
                    : summary.overallPercent >= 80
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }
              >
                {summary.overallPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  summary.overallPercent > 100
                    ? 'bg-rose-500'
                    : summary.overallPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(summary.overallPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Tabel Rincian Kategori (Preview Sebelum Download) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Preview Tabel Laporan ({reportItems.length} Kategori)
              </span>
              <span className="text-[11px] text-slate-400">
                Format file: Laporan_Catat_Duit_{getMonthNameIndo(reportMonth)}_{reportMonth.split('-')[0]}.pdf
              </span>
            </div>

            {loadingBudgets ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat data anggaran periode {formatMonthYear(reportMonth)}...</span>
              </div>
            ) : reportItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                Tidak ada data anggaran maupun transaksi pengeluaran pada periode {formatMonthYear(reportMonth)}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-[320px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">No</th>
                        <th className="py-2.5 px-3">Nama Kategori</th>
                        <th className="py-2.5 px-3 text-right">Anggaran Awal</th>
                        <th className="py-2.5 px-3 text-right">Pengeluaran Aktual</th>
                        <th className="py-2.5 px-3 text-right">Sisa Anggaran</th>
                        <th className="py-2.5 px-3 text-center">Penggunaan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportItems.map((item, idx) => {
                        const isOver = item.status === 'over'
                        const isHabis = item.status === 'habis'

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition ${
                              isOver ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <span>{item.label}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                              {formatRupiah(item.anggaran)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatRupiah(item.terpakai)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              {item.sisa > 0 ? (
                                <span className="text-emerald-600">{formatRupiah(item.sisa)}</span>
                              ) : item.sisa === 0 ? (
                                <span className="text-slate-400">Rp 0</span>
                              ) : (
                                <span className="text-rose-600">
                                  -{formatRupiah(Math.abs(item.sisa))}
                                  <span className="block text-[10px] text-rose-500 font-normal">
                                    (Lebih {formatRupiah(Math.abs(item.sisa))})
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                              {item.anggaran > 0 ? `${item.percent.toFixed(1)}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isOver ? (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Melebihi Anggaran
                                </span>
                              ) : isHabis ? (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
                                  Habis
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                  Tersisa
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 text-xs">
                      <tr>
                        <td colSpan={2} className="py-3 px-3">
                          Total Keseluruhan
                        </td>
                        <td className="py-3 px-3 text-right">
                          {formatRupiah(summary.totalAnggaran)}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-600">
                          {formatRupiah(summary.totalTerpakai)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right ${
                            summary.totalSisa >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {summary.totalSisa < 0 ? '-' : ''}
                          {formatRupiah(Math.abs(summary.totalSisa))}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {summary.overallPercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          {summary.overCount > 0 ? (
                            <span className="text-rose-600">{summary.overCount} Overbudget</span>
                          ) : (
                            <span className="text-emerald-600">Aman</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal: Tombol Aksi Download */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Laporan terverifikasi untuk <strong>{user?.email || 'User'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading || reportItems.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF ({getMonthNameIndo(reportMonth)} {reportMonth.split('-')[0]})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
