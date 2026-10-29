import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Navbar from './components/Navbar'
import ConfigNotice from './components/ConfigNotice'
import AuthModal from './components/AuthModal'
import DashboardCards from './components/DashboardCards'
import BudgetDashboard from './components/BudgetDashboard'
import BudgetModal from './components/BudgetModal'
import TelegramConnectModal from './components/TelegramConnectModal'
import FilterBar from './components/FilterBar'
import CategoryChart from './components/CategoryChart'
import TransactionList from './components/TransactionList'
import TransactionForm from './components/TransactionForm'
import MonthlyReportModal from './components/MonthlyReportModal'
import { getCurrentYearMonth } from './utils/formatters'
import { PlusCircle, Sparkles, AlertCircle, RefreshCw, Info, Target, FileSpreadsheet } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [isDemoMode, setIsDemoMode] = useState(false)

  // State Filter
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth())
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedType, setSelectedType] = useState('')

  // State Modal Transaksi
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [seedingLoading, setSeedingLoading] = useState(false)

  // State Anggaran (Budgeting)
  const [budgets, setBudgets] = useState([])
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)

  // State Integrasi Telegram
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false)
  const [isTelegramConnected, setIsTelegramConnected] = useState(false)

  // State Laporan Bulanan (PDF)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // 1. Cek Sesi Autentikasi Supabase saat aplikasi dibuka
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false)
      return
    }

    // Ambil sesi login aktif
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // Listener jika ada perubahan status login (login/logout/refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Mengambil data transaksi dari tabel 'transactions' di Supabase
  const fetchTransactions = useCallback(async () => {
    if (!user || !supabase || isDemoMode) return

    setLoadingTransactions(true)
    setFetchError('')

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setFetchError(
        'Gagal mengakses tabel Supabase. Pastikan Anda telah menjalankan skrip `supabase/schema.sql` di SQL Editor Supabase.'
      )
    } finally {
      setLoadingTransactions(false)
    }
  }, [user, isDemoMode])

  // 3. Mengambil data anggaran bulanan dari tabel 'category_budgets'
  const fetchBudgets = useCallback(async () => {
    if (!user || !supabase || isDemoMode) return

    try {
      const { data, error } = await supabase
        .from('category_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year_month', selectedMonth)
        .order('amount', { ascending: false })

      if (error && !error.message.includes('relation "public.category_budgets" does not exist')) {
        console.error('Error fetching budgets:', error)
      }
      setBudgets(data || [])
    } catch (err) {
      console.warn('Budgets fetch error:', err.message)
    }
  }, [user, selectedMonth, isDemoMode])

  // 4. Memeriksa apakah user sudah menghubungkan Telegram
  const fetchTelegramBinding = useCallback(async () => {
    if (!user || !supabase || isDemoMode) return

    try {
      const { data } = await supabase
        .from('telegram_bindings')
        .select('id, telegram_chat_id, telegram_username')
        .eq('user_id', user.id)
        .maybeSingle()

      setIsTelegramConnected(Boolean(data))
    } catch {
      // ignore
    }
  }, [user, isDemoMode])

  useEffect(() => {
    if (user && !isDemoMode) {
      fetchTransactions()
      fetchBudgets()
      fetchTelegramBinding()
    } else if (!user && !isDemoMode) {
      setTransactions([])
      setBudgets([])
      setIsTelegramConnected(false)
    }
  }, [user, isDemoMode, fetchTransactions, fetchBudgets, fetchTelegramBinding])

  // 5. Masuk ke Mode Demo (Tanpa perlu Supabase terlebih dahulu)
  const handleStartDemoMode = () => {
    setIsDemoMode(true)
    setUser({ email: 'tamu@demo.local', id: 'demo-user-123' })
    const today = new Date().toISOString().split('T')[0]
    setTransactions([
      {
        id: 'demo-1',
        type: 'expense',
        amount: 500000,
        category: 'Belanja',
        description: 'Belanja Bulanan',
        transaction_date: today,
        source: 'telegram',
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-2',
        type: 'expense',
        amount: 25000,
        category: 'Transportasi',
        description: 'Bensin',
        transaction_date: today,
        source: 'telegram',
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-3',
        type: 'income',
        amount: 9000000,
        category: 'Gaji',
        description: 'Gaji Pokok',
        transaction_date: today,
        source: 'manual',
        created_at: new Date().toISOString(),
      },
    ])
    setBudgets([
      {
        id: 'demo-b-1',
        category: 'Belanja',
        amount: 600000,
        year_month: selectedMonth,
      },
      {
        id: 'demo-b-2',
        category: 'Transportasi',
        amount: 300000,
        year_month: selectedMonth,
      },
      {
        id: 'demo-b-3',
        category: 'Makanan',
        amount: 900000,
        year_month: selectedMonth,
      },
      {
        id: 'demo-b-4',
        category: 'Hiburan',
        amount: 200000,
        year_month: selectedMonth,
      },
    ])
    setIsTelegramConnected(true)
  }

  // 6. Tambah atau Perbarui Transaksi
  const handleSaveTransaction = async (txData) => {
    if (isDemoMode) {
      if (txData.id) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === txData.id ? { ...item, ...txData } : item))
        )
      } else {
        const newDemoTx = {
          ...txData,
          id: 'demo-' + Date.now(),
          created_at: new Date().toISOString(),
          source: txData.source || 'manual',
        }
        setTransactions((prev) => [newDemoTx, ...prev])
      }
      return
    }

    if (!user || !supabase) return

    if (txData.id) {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: txData.type,
          amount: txData.amount,
          category: txData.category,
          description: txData.description,
          transaction_date: txData.transaction_date,
          source: txData.source || 'manual',
        })
        .eq('id', txData.id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('transactions').insert([
        {
          user_id: user.id,
          type: txData.type,
          amount: txData.amount,
          category: txData.category,
          description: txData.description,
          transaction_date: txData.transaction_date,
          source: txData.source || 'manual',
        },
      ])

      if (error) throw error
    }

    await fetchTransactions()
  }

  // 7. Hapus Transaksi (DELETE)
  const handleDeleteTransaction = async (id) => {
    if (isDemoMode) {
      setTransactions((prev) => prev.filter((item) => item.id !== id))
      return
    }

    if (!user || !supabase) return

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      alert('Gagal menghapus transaksi: ' + error.message)
      return
    }

    setTransactions((prev) => prev.filter((item) => item.id !== id))
  }

  // 8. Tambah / Edit Anggaran Bulanan
  const handleSaveBudget = async (budgetData) => {
    if (isDemoMode) {
      if (budgetData.id) {
        setBudgets((prev) =>
          prev.map((b) => (b.id === budgetData.id ? { ...b, ...budgetData } : b))
        )
      } else {
        const newB = { ...budgetData, id: 'demo-b-' + Date.now() }
        setBudgets((prev) => [...prev, newB])
      }
      return
    }

    if (!user || !supabase) return

    if (budgetData.id) {
      const { error } = await supabase
        .from('category_budgets')
        .update({
          amount: budgetData.amount,
        })
        .eq('id', budgetData.id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('category_budgets').insert([
        {
          user_id: user.id,
          category: budgetData.category,
          amount: budgetData.amount,
          year_month: budgetData.year_month,
        },
      ])

      if (error) throw error
    }

    await fetchBudgets()
  }

  // 9. Hapus Anggaran Kategori
  const handleDeleteBudget = async (budgetId) => {
    if (isDemoMode) {
      setBudgets((prev) => prev.filter((b) => b.id !== budgetId))
      return
    }

    if (!user || !supabase) return

    const { error } = await supabase.from('category_budgets').delete().eq('id', budgetId)
    if (error) throw error

    setBudgets((prev) => prev.filter((b) => b.id !== budgetId))
  }

  // 10. Paket Contoh Anggaran Otomatis (Belanja Bulanan, Transportasi, Makan, Hiburan)
  const handleQuickSeedBudgets = async () => {
    const defaultTemplates = [
      { category: 'Belanja', amount: 600000 },
      { category: 'Transportasi', amount: 300000 },
      { category: 'Makanan', amount: 900000 },
      { category: 'Hiburan', amount: 200000 },
    ]

    if (isDemoMode) {
      const items = defaultTemplates.map((t, idx) => ({
        id: 'demo-b-seed-' + idx,
        category: t.category,
        amount: t.amount,
        year_month: selectedMonth,
      }))
      setBudgets(items)
      return
    }

    if (!user || !supabase) return

    try {
      const rows = defaultTemplates.map((t) => ({
        user_id: user.id,
        category: t.category,
        amount: t.amount,
        year_month: selectedMonth,
      }))

      const { error } = await supabase
        .from('category_budgets')
        .upsert(rows, { onConflict: 'user_id, category, year_month' })

      if (error) throw error
      await fetchBudgets()
    } catch (err) {
      if (err.message?.includes('category_budgets') || err.message?.includes('schema cache')) {
        alert(
          'Tabel database `category_budgets` belum dibuat di Supabase!\n\nSilakan buka Supabase Dashboard -> menu SQL Editor, lalu jalankan file `supabase/migrations_multiuser_and_budget.sql`.'
        )
      } else {
        alert('Gagal membuat paket anggaran contoh: ' + err.message)
      }
    }
  }

  // 11. Masukkan Contoh Transaksi Otomatis (Cilok, Bensin, Gaji)
  const handleSeedExampleData = async () => {
    setSeedingLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const exampleItems = [
      {
        id: isDemoMode ? 'demo-' + Date.now() + '-1' : undefined,
        user_id: user?.id,
        type: 'expense',
        amount: 5000,
        category: 'Makanan',
        description: 'Cilok',
        transaction_date: today,
        source: 'manual',
      },
      {
        id: isDemoMode ? 'demo-' + Date.now() + '-2' : undefined,
        user_id: user?.id,
        type: 'expense',
        amount: 20000,
        category: 'Transportasi',
        description: 'Bensin',
        transaction_date: today,
        source: 'manual',
      },
      {
        id: isDemoMode ? 'demo-' + Date.now() + '-3' : undefined,
        user_id: user?.id,
        type: 'income',
        amount: 9000000,
        category: 'Gaji',
        description: 'Gaji Bulanan',
        transaction_date: today,
        source: 'manual',
      },
    ]

    try {
      if (isDemoMode) {
        setTransactions((prev) => [...exampleItems, ...prev])
      } else {
        const { error } = await supabase.from('transactions').insert(exampleItems)
        if (error) throw error
        await fetchTransactions()
      }
    } catch (err) {
      alert('Gagal membuat data contoh: ' + err.message)
    } finally {
      setSeedingLoading(false)
    }
  }

  // 12. Logout
  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false)
      setUser(null)
      setTransactions([])
      setBudgets([])
      return
    }
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  // 13. Filter Transaksi Berdasarkan Bulan, Kategori, dan Tipe
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedMonth && !tx.transaction_date?.startsWith(selectedMonth)) {
        return false
      }
      if (selectedCategory && tx.category !== selectedCategory) {
        return false
      }
      if (selectedType && tx.type !== selectedType) {
        return false
      }
      return true
    })
  }, [transactions, selectedMonth, selectedCategory, selectedType])

  // 14. Hitung Ringkasan Dashboard (Total Pemasukan, Pengeluaran, Saldo)
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const monthTx = transactions.filter((tx) =>
      selectedMonth ? tx.transaction_date?.startsWith(selectedMonth) : true
    )

    let income = 0
    let expense = 0

    monthTx.forEach((tx) => {
      const amt = Number(tx.amount || 0)
      if (tx.type === 'income') {
        income += amt
      } else if (tx.type === 'expense') {
        expense += amt
      }
    })

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    }
  }, [transactions, selectedMonth])

  // Jika Supabase belum dikonfigurasi & bukan mode demo
  if (!isSupabaseConfigured && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={null} onLogout={() => {}} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
          <ConfigNotice onTryDemo={handleStartDemoMode} />
        </main>
      </div>
    )
  }

  // Loading status sesi awal
  if (authLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Memeriksa autentikasi...</span>
        </div>
      </div>
    )
  }

  // Jika user belum login & bukan mode demo
  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar user={null} onLogout={() => {}} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6">
          <AuthModal onAuthSuccess={(loggedInUser) => setUser(loggedInUser)} />
        </main>
      </div>
    )
  }

  // Tampilan Utama Aplikasi
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenTelegram={() => setIsTelegramModalOpen(true)}
        isTelegramConnected={isTelegramConnected}
        onOpenReport={() => setIsReportModalOpen(true)}
      />

      {/* Banner Khusus Mode Demo */}
      {isDemoMode && (
        <div className="bg-amber-500 text-slate-900 px-4 py-2.5 shadow-xs border-b border-amber-600/20">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Mode Demo Aktif:</strong> Anda sedang mencoba seluruh fitur aplikasi secara interaktif. Data tersimpan sementara di memori browser.
              </span>
            </div>
            <button
              onClick={() => {
                setIsDemoMode(false)
                setUser(null)
              }}
              className="px-3 py-1 bg-slate-950 text-white rounded-lg font-bold hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
            >
              Hubungkan Database Supabase
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Banner Error Fetch (jika schema SQL belum dijalankan di Supabase) */}
        {fetchError && !isDemoMode && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed flex-1">
              <p className="font-bold mb-1">Gagal Mengakses Tabel Database</p>
              <p>{fetchError}</p>
            </div>
            <button
              onClick={fetchTransactions}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard Keuangan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Pantau arus kas pribadi dan penjatahan anggaran bulanan Anda
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsReportModalOpen(true)}
              title="Buka ringkasan & download laporan pengeluaran bulanan dalam bentuk file PDF"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Laporan Bulanan</span>
            </button>

            <button
              onClick={() => {
                setEditingBudget(null)
                setIsBudgetModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Atur Anggaran</span>
            </button>

            {transactions.length === 0 && (
              <button
                onClick={handleSeedExampleData}
                disabled={seedingLoading}
                title="Masukkan data contoh: Cilok (Rp5.000), Bensin (Rp20.000), Gaji (Rp9.000.000)"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{seedingLoading ? 'Membuat Data...' : 'Isi Data Contoh'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingTransaction(null)
                setIsFormOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Transaksi</span>
            </button>
          </div>
        </div>

        {/* 1. Dashboard Total Pemasukan, Pengeluaran, Saldo */}
        <DashboardCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
          selectedMonth={selectedMonth}
        />

        {/* 2. FITUR 2: Dashboard Penjatahan Anggaran Bulanan & Realisasi Kuota */}
        <BudgetDashboard
          budgets={budgets}
          transactions={transactions}
          selectedMonth={selectedMonth}
          onOpenAddBudget={() => {
            setEditingBudget(null)
            setIsBudgetModalOpen(true)
          }}
          onEditBudget={(budget) => {
            setEditingBudget(budget)
            setIsBudgetModalOpen(true)
          }}
          onQuickSeedBudgets={handleQuickSeedBudgets}
        />

        {/* 3. Grafik Pengeluaran per Kategori */}
        <CategoryChart transactions={filteredTransactions} />

        {/* 4. Bar Filter (Bulan, Kategori, Tipe) */}
        <FilterBar
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onResetFilters={() => {
            setSelectedCategory('')
            setSelectedType('')
          }}
        />

        {/* 5. Daftar Riwayat Transaksi */}
        <TransactionList
          transactions={filteredTransactions}
          onEdit={(tx) => {
            setEditingTransaction(tx)
            setIsFormOpen(true)
          }}
          onDelete={handleDeleteTransaction}
          loading={loadingTransactions}
        />
      </main>

      {/* Modal Form Tambah / Edit Transaksi */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSaveTransaction}
        editData={editingTransaction}
      />

      {/* Modal Tambah / Edit Anggaran Bulanan */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false)
          setEditingBudget(null)
        }}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
        editBudget={editingBudget}
        currentMonth={selectedMonth}
      />

      {/* Modal Integrasi Bot Telegram */}
      <TelegramConnectModal
        isOpen={isTelegramModalOpen}
        onClose={() => {
          setIsTelegramModalOpen(false)
          fetchTelegramBinding()
        }}
        user={user}
        isDemoMode={isDemoMode}
      />

      {/* Modal Laporan Bulanan (PDF) */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        user={user}
        selectedMonth={selectedMonth}
        budgets={budgets}
        transactions={transactions}
        isDemoMode={isDemoMode}
      />
    </div>
  )
}
