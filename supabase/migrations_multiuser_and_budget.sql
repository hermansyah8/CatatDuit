-- ==============================================================================
-- MIGRASI: MULTI-USER TELEGRAM BOT & PENJATAHAN ANGGARAN BULANAN (BUDGETING)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor pada Supabase Dashboard Anda.
-- Skrip ini bersifat idempotent (aman dijalankan berulang kali tanpa merusak data lama).
-- ==============================================================================

-- 1. Tabel untuk Menghubungkan Akun Website dengan Akun Telegram
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

create index if not exists idx_telegram_bindings_chat_id 
    on public.telegram_bindings (telegram_chat_id);
create index if not exists idx_telegram_bindings_user_id 
    on public.telegram_bindings (user_id);

-- 2. Tabel Token Sekali Pakai untuk Menghubungkan Telegram (Expired 15 menit)
create table if not exists public.telegram_link_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    token varchar(32) not null unique,
    expires_at timestamptz not null,
    is_used boolean not null default false,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_telegram_link_tokens_token 
    on public.telegram_link_tokens (token);
create index if not exists idx_telegram_link_tokens_user 
    on public.telegram_link_tokens (user_id);

-- 3. Tabel Penjatahan Anggaran Bulanan per Kategori
create table if not exists public.category_budgets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
    category text not null,
    year_month varchar(7) not null, -- Format: YYYY-MM (misal: 2026-10)
    amount numeric(15, 2) not null check (amount > 0),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint uq_category_budgets unique (user_id, category, year_month)
);

create index if not exists idx_category_budgets_user_period 
    on public.category_budgets (user_id, year_month);

-- 4. Dukungan Idempotensi pada Transaksi (Mencegah Pencatatan Pesan Ganda dari Telegram)
alter table public.transactions 
    add column if not exists telegram_message_id bigint;

create unique index if not exists idx_transactions_user_tg_msg 
    on public.transactions (user_id, telegram_message_id) 
    where telegram_message_id is not null;

-- 5. Row Level Security (RLS) untuk Tabel Baru
alter table public.telegram_bindings enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.category_budgets enable row level security;

-- Policies untuk telegram_bindings
drop policy if exists "Users can view their own telegram bindings" on public.telegram_bindings;
create policy "Users can view their own telegram bindings"
    on public.telegram_bindings for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own telegram bindings" on public.telegram_bindings;
create policy "Users can insert their own telegram bindings"
    on public.telegram_bindings for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own telegram bindings" on public.telegram_bindings;
create policy "Users can update their own telegram bindings"
    on public.telegram_bindings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own telegram bindings" on public.telegram_bindings;
create policy "Users can delete their own telegram bindings"
    on public.telegram_bindings for delete
    using (auth.uid() = user_id);

-- Policies untuk telegram_link_tokens
drop policy if exists "Users can view their own link tokens" on public.telegram_link_tokens;
create policy "Users can view their own link tokens"
    on public.telegram_link_tokens for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own link tokens" on public.telegram_link_tokens;
create policy "Users can create their own link tokens"
    on public.telegram_link_tokens for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own link tokens" on public.telegram_link_tokens;
create policy "Users can update their own link tokens"
    on public.telegram_link_tokens for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own link tokens" on public.telegram_link_tokens;
create policy "Users can delete their own link tokens"
    on public.telegram_link_tokens for delete
    using (auth.uid() = user_id);

-- Policies untuk category_budgets
drop policy if exists "Users can view their own budgets" on public.category_budgets;
create policy "Users can view their own budgets"
    on public.category_budgets for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create their own budgets" on public.category_budgets;
create policy "Users can create their own budgets"
    on public.category_budgets for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update their own budgets" on public.category_budgets;
create policy "Users can update their own budgets"
    on public.category_budgets for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own budgets" on public.category_budgets;
create policy "Users can delete their own budgets"
    on public.category_budgets for delete
    using (auth.uid() = user_id);

-- 6. Trigger Otomatis updated_at
drop trigger if exists set_updated_at_bindings on public.telegram_bindings;
create trigger set_updated_at_bindings
    before update on public.telegram_bindings
    for each row
    execute function public.handle_updated_at();

drop trigger if exists set_updated_at_budgets on public.category_budgets;
create trigger set_updated_at_budgets
    before update on public.category_budgets
    for each row
    execute function public.handle_updated_at();
