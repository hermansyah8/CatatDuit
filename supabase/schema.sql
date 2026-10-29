-- ==============================================================================
-- SKEMA DATABASE: CATAT DUIT (PENCATATAN KEUANGAN PRIBADI)
-- ==============================================================================
-- Skema ini dirancang untuk dieksekusi di SQL Editor pada Dashboard Supabase.
-- Mendukung autentikasi pengguna, Row Level Security (RLS), dan dirancang
-- agar nantinya dapat menerima input dari WhatsApp / Telegram / API lainnya.
-- ==============================================================================

-- 1. Buat Tabel Transaksi
create table if not exists public.transactions (
    -- ID unik transaksi menggunakan UUID v4
    id uuid primary key default gen_random_uuid(),

    -- Relasi ke tabel pengguna Supabase Auth
    -- Otomatis terisi dengan ID pengguna yang sedang login melalui auth.uid()
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),

    -- Tipe transaksi: 'income' (pemasukan) atau 'expense' (pengeluaran)
    type text not null check (type in ('income', 'expense')),

    -- Nominal transaksi (maksimal hingga ratusan triliun dengan 2 angka di belakang koma)
    amount numeric(15, 2) not null check (amount > 0),

    -- Kategori transaksi (misal: Makanan, Transportasi, Gaji, dll)
    category text not null,

    -- Catatan / deskripsi transaksi (misal: "Cilok", "Bensin", "Gaji Bulanan")
    description text,

    -- Tanggal transaksi dilakukan (format YYYY-MM-DD, default hari ini)
    transaction_date date not null default current_date,

    -- Sumber input transaksi: dipersiapkan untuk fase integrasi bot
    -- Nilai default adalah 'manual' (dari website)
    -- Nantinya bot WA/Telegram dapat mengirimkan nilai 'whatsapp' atau 'telegram'
    source text not null default 'manual' check (source in ('manual', 'whatsapp', 'telegram')),

    -- Timestamp kapan data dibuat dan terakhir diperbarui
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. Index untuk Mempercepat Query
-- ==============================================================================
-- Index ini mempercepat pencarian data per user berdasarkan tanggal dan kategori
create index if not exists idx_transactions_user_date 
    on public.transactions (user_id, transaction_date desc);

create index if not exists idx_transactions_user_category 
    on public.transactions (user_id, category);

-- ==============================================================================
-- 3. Row Level Security (RLS) - Keamanan Tingkat Baris
-- ==============================================================================
-- Aktifkan RLS pada tabel transactions
alter table public.transactions enable row level security;

-- Policy 1: Pengguna hanya boleh MELIHAT transaksi miliknya sendiri
create policy "Users can view their own transactions"
    on public.transactions
    for select
    using (auth.uid() = user_id);

-- Policy 2: Pengguna hanya boleh MENAMBAH transaksi miliknya sendiri
create policy "Users can insert their own transactions"
    on public.transactions
    for insert
    with check (auth.uid() = user_id);

-- Policy 3: Pengguna hanya boleh MENGUBAH transaksi miliknya sendiri
create policy "Users can update their own transactions"
    on public.transactions
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policy 4: Pengguna hanya boleh MENGHAPUS transaksi miliknya sendiri
create policy "Users can delete their own transactions"
    on public.transactions
    for delete
    using (auth.uid() = user_id);

-- ==============================================================================
-- 4. Fungsi & Trigger untuk Mengupdate 'updated_at' Secara Otomatis
-- ==============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at
    before update on public.transactions
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 5. Tabel Penghubung Akun Telegram (Multi-User)
-- ==============================================================================
create table if not exists public.telegram_bindings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    telegram_chat_id bigint not null,
    telegram_user_id bigint not null,
    telegram_username text,
    first_name text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint uq_telegram_bindings_user_id unique (user_id),
    constraint uq_telegram_bindings_chat_id unique (telegram_chat_id)
);

create index if not exists idx_telegram_bindings_chat_id on public.telegram_bindings (telegram_chat_id);
create index if not exists idx_telegram_bindings_user_id on public.telegram_bindings (user_id);

alter table public.telegram_bindings enable row level security;

create policy "Users can view their own telegram bindings"
    on public.telegram_bindings for select using (auth.uid() = user_id);
create policy "Users can insert their own telegram bindings"
    on public.telegram_bindings for insert with check (auth.uid() = user_id);
create policy "Users can update their own telegram bindings"
    on public.telegram_bindings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own telegram bindings"
    on public.telegram_bindings for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at_bindings on public.telegram_bindings;
create trigger set_updated_at_bindings
    before update on public.telegram_bindings
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 6. Tabel Token Sekali Pakai untuk Menghubungkan Telegram
-- ==============================================================================
create table if not exists public.telegram_link_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    token varchar(32) not null unique,
    expires_at timestamptz not null,
    is_used boolean not null default false,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_telegram_link_tokens_token on public.telegram_link_tokens (token);
create index if not exists idx_telegram_link_tokens_user on public.telegram_link_tokens (user_id);

alter table public.telegram_link_tokens enable row level security;

create policy "Users can view their own link tokens"
    on public.telegram_link_tokens for select using (auth.uid() = user_id);
create policy "Users can create their own link tokens"
    on public.telegram_link_tokens for insert with check (auth.uid() = user_id);
create policy "Users can update their own link tokens"
    on public.telegram_link_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own link tokens"
    on public.telegram_link_tokens for delete using (auth.uid() = user_id);

-- ==============================================================================
-- 7. Tabel Penjatahan Anggaran Bulanan (Category Budgets)
-- ==============================================================================
create table if not exists public.category_budgets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
    category text not null,
    year_month varchar(7) not null,
    amount numeric(15, 2) not null check (amount > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint uq_category_budgets unique (user_id, category, year_month)
);

create index if not exists idx_category_budgets_user_period on public.category_budgets (user_id, year_month);

alter table public.category_budgets enable row level security;

create policy "Users can view their own budgets"
    on public.category_budgets for select using (auth.uid() = user_id);
create policy "Users can create their own budgets"
    on public.category_budgets for insert with check (auth.uid() = user_id);
create policy "Users can update their own budgets"
    on public.category_budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own budgets"
    on public.category_budgets for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at_budgets on public.category_budgets;
create trigger set_updated_at_budgets
    before update on public.category_budgets
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 8. Kolom telegram_message_id untuk Idempotensi
-- ==============================================================================
alter table public.transactions add column if not exists telegram_message_id bigint;
create unique index if not exists idx_transactions_user_tg_msg 
    on public.transactions (user_id, telegram_message_id) 
    where telegram_message_id is not null;

