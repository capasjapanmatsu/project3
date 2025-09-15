-- Create public photos bucket (id=name='photos')
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;

-- Allow public read for photos bucket
create policy if not exists "Public read photos"
on storage.objects for select to anon, authenticated
using (bucket_id = 'photos');

-- Allow authenticated users to upload into photos bucket
create policy if not exists "Authenticated upload photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'photos');

-- Allow owners to update/delete their own objects in photos bucket
create policy if not exists "Owner update photos"
on storage.objects for update to authenticated
using (bucket_id = 'photos' and owner = auth.uid())
with check (bucket_id = 'photos' and owner = auth.uid());

create policy if not exists "Owner delete photos"
on storage.objects for delete to authenticated
using (bucket_id = 'photos' and owner = auth.uid());


