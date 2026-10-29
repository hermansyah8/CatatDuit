import { createClient } from '@supabase/supabase-js'

// Ambil URL dan Anon Key dari environment variables Vite (.env)
const rawUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Normalisasi URL: Jika pengguna menyalin URL REST endpoint (.../rest/v1/), kita bersihkan
// agar menjadi base project URL (https://xxxx.supabase.co)
const supabaseUrl = rawUrl
  ? rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : ''

// Validasi sederhana: cek apakah nilai sudah diisi dan bukan placeholder default
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key-here'
)

// Inisialisasi Supabase Client jika kredensial sudah tersedia
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
