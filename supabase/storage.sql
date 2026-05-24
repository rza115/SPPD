-- SPPD Generator — Supabase Storage untuk file template .docx
-- Jalankan di SQL Editor SETELAH schema.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sppd-templates',
  'sppd-templates',
  false,
  52428800,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {user_id}/{template_id}/{filename}
-- Contoh: a1b2c3d4-.../tpl_171234/file.docx

drop policy if exists "sppd_templates_select_own" on storage.objects;
create policy "sppd_templates_select_own"
  on storage.objects for select
  using (
    bucket_id = 'sppd-templates'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

drop policy if exists "sppd_templates_insert_own" on storage.objects;
create policy "sppd_templates_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'sppd-templates'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

drop policy if exists "sppd_templates_update_own" on storage.objects;
create policy "sppd_templates_update_own"
  on storage.objects for update
  using (
    bucket_id = 'sppd-templates'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  )
  with check (
    bucket_id = 'sppd-templates'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

drop policy if exists "sppd_templates_delete_own" on storage.objects;
create policy "sppd_templates_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'sppd-templates'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
