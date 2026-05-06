-- Create RLS policies for rv-photos storage bucket

-- Allow anyone to read (select) files
create policy "Allow public read access"
  on storage.objects for select
  using ( bucket_id = 'rv-photos' );

-- Allow anyone to upload (insert) files
create policy "Allow public upload"
  on storage.objects for insert
  with check ( bucket_id = 'rv-photos' );

-- Allow anyone to update files
create policy "Allow public update"
  on storage.objects for update
  using ( bucket_id = 'rv-photos' );

-- Allow anyone to delete files
create policy "Allow public delete"
  on storage.objects for delete
  using ( bucket_id = 'rv-photos' );
