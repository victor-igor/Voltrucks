-- Create the storage bucket for campaign media
insert into storage.buckets (id, name, public)
values ('campaign-media', 'campaign-media', true);

-- Policy to allow public access to view files (since it's a public bucket, effectively)
-- But we still need policies for select/insert/update/delete

-- Allow public read access (it's a public bucket, but good to be explicit for non-authed if public=true handles it, but RLS on objects still applies)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'campaign-media' );

-- Allow authenticated users to upload files
create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check ( bucket_id = 'campaign-media' and auth.role() = 'authenticated' );

-- Allow users to update their own files (optional, but good for completeness)
create policy "Users can update their own media"
  on storage.objects for update
  using ( bucket_id = 'campaign-media' and auth.uid() = owner )
  with check ( bucket_id = 'campaign-media' and auth.uid() = owner );

-- Allow users to delete their own files
create policy "Users can delete their own media"
  on storage.objects for delete
  using ( bucket_id = 'campaign-media' and auth.uid() = owner );
