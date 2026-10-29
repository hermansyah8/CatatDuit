import { useState } from 'react'
import { AlertTriangle, Database, KeyRound, ExternalLink, CheckCircle2, Copy } from 'lucide-react'

export default function ConfigNotice({ onTryDemo }) {
  const [copied, setCopied] = useState(false)

  const handleCopyEnv = () => {
    const template = `VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`
    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto my-8 p-6 bg-white border border-amber-200 rounded-3xl shadow-sm text-slate-800">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl flex-shrink-0">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <h2 className="text-xl font-bold text-slate-900">
              Konfigurasi Supabase Belum Terhubung
            </h2>
            {onTryDemo && (
              <button
                type="button"
                onClick={onTryDemo}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>Coba Mode Demo Sekarang</span>
                <span>→</span>
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            Aplikasi dirancang untuk menyimpan data ke database <strong>Supabase PostgreSQL</strong>. Anda dapat langsung menguji tampilan & seluruh fitur melalui <strong>Mode Demo</strong> di atas, atau ikuti 3 langkah berikut untuk menghubungkan database Supabase Anda:
          </p>

          <div className="space-y-4 text-sm">
            {/* Langkah 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Buat Project Supabase & Ambil Kunci API
              </div>
              <p className="text-slate-600 mb-2">
                Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium">Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" /></a>, buka menu <strong>Project Settings</strong> → <strong>API</strong>. Salin <strong>Project URL</strong> dan <strong>anon public key</strong>.
              </p>
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                ⚠️ Catatan Penting: Jangan pernah menyalin <code>service_role</code> secret key ke file frontend!
              </div>
            </div>

            {/* Langkah 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                Buat File <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded">.env</code>
              </div>
              <p className="text-slate-600 mb-2">
                Buat file bernama <code>.env</code> di root folder project ini, lalu isi dengan kunci yang Anda salin:
              </p>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs flex justify-between items-center">
                <div>
                  <div>VITE_SUPABASE_URL=https://xxxx.supabase.co</div>
                  <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
                </div>
                <button
                  onClick={handleCopyEnv}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded flex items-center gap-1 transition"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            {/* Langkah 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Jalankan Skema Database di SQL Editor
              </div>
              <p className="text-slate-600">
                Buka menu <strong>SQL Editor</strong> di dashboard Supabase Anda, buka file <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code> yang sudah disediakan di proyek ini, lalu klik <strong>Run</strong> untuk membuat tabel <code>transactions</code> dan aturan Row Level Security (RLS).
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
            Setelah membuat file <code>.env</code>, jangan lupa restart development server (matikan lalu jalankan kembali <code>npm run dev</code>).
          </div>
        </div>
      </div>
    </div>
  )
}
