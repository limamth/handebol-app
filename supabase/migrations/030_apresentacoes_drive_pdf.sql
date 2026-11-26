-- Migração 030: Suporte a Google Slides/Drive (online) e Cache em PDF (offline) nas Apresentações
-- Executar no SQL Editor do Supabase após a 029.

alter table apresentacoes
  add column if not exists google_slides_url text,
  add column if not exists pdf_storage_path text,
  add column if not exists pdf_nome text,
  add column if not exists pdf_tamanho_bytes bigint;

-- Bucket privado no Supabase Storage para armazenar os PDFs das apresentações
insert into storage.buckets (id, name, public)
values ('apresentacoes', 'apresentacoes', false)
on conflict (id) do nothing;

drop policy if exists "membros clube veem pdfs apresentacoes" on storage.objects;
create policy "membros clube veem pdfs apresentacoes" on storage.objects for select
  using (
    bucket_id = 'apresentacoes'
    and (storage.foldername(name))[1] = meu_clube()::text
  );

drop policy if exists "staff envia pdfs apresentacoes" on storage.objects;
create policy "staff envia pdfs apresentacoes" on storage.objects for insert
  with check (
    bucket_id = 'apresentacoes'
    and (storage.foldername(name))[1] = meu_clube()::text
    and meu_papel() in ('gestor', 'comissao_tecnica')
  );

drop policy if exists "staff atualiza pdfs apresentacoes" on storage.objects;
create policy "staff atualiza pdfs apresentacoes" on storage.objects for update
  using (
    bucket_id = 'apresentacoes'
    and (storage.foldername(name))[1] = meu_clube()::text
    and meu_papel() in ('gestor', 'comissao_tecnica')
  );

drop policy if exists "staff remove pdfs apresentacoes" on storage.objects;
create policy "staff remove pdfs apresentacoes" on storage.objects for delete
  using (
    bucket_id = 'apresentacoes'
    and (storage.foldername(name))[1] = meu_clube()::text
    and meu_papel() in ('gestor', 'comissao_tecnica')
  );
