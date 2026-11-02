-- Ejecutar en SQL Editor del proyecto. La app usa la clave publicable y el
-- token de cada usuario: estas reglas impiden leer o escribir otra cuenta.
create table if not exists public.winy_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint progress_size check (octet_length(progress::text) <= 250000)
);
alter table public.winy_progress enable row level security;
revoke all on public.winy_progress from anon;
grant select, insert, update on public.winy_progress to authenticated;
drop policy if exists "Leer mi progreso" on public.winy_progress;
create policy "Leer mi progreso" on public.winy_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Crear mi progreso" on public.winy_progress;
create policy "Crear mi progreso" on public.winy_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Actualizar mi progreso" on public.winy_progress;
create policy "Actualizar mi progreso" on public.winy_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
