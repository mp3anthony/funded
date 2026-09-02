-- New storage bucket for in-app bug-report screenshots (Slice 15, #114).
-- Unlike `avatars` (created via the dashboard, documented after the fact —
-- see 20260717000000_avatars_bucket_config.sql), this bucket is created
-- here directly since it didn't exist yet.
--
-- Public read: these are diagnostic screenshots attached to a public GitHub
-- issue anyway, so there is nothing gained by hiding them behind auth.
-- Write access is locked down to authenticated users only, matching the
-- `avatars` bucket's existing policy shape exactly (same INSERT-only,
-- authenticated-role, bucket_id-scoped pattern).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bug-report-screenshots',
  'bug-report-screenshots',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Allow authenticated users to upload bug report screenshots"
on storage.objects for insert
to authenticated
with check (bucket_id = 'bug-report-screenshots');

create policy "Allow public to view bug report screenshots"
on storage.objects for select
to public
using (bucket_id = 'bug-report-screenshots');
