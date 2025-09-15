-- Create public photos bucket (id=name='photos')
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;

-- Allow public read for photos bucket
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read photos'
  ) then
    create policy "Public read photos"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'photos');
  end if;
end $$;

-- Allow authenticated users to upload into photos bucket
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated upload photos'
  ) then
    create policy "Authenticated upload photos"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'photos');
  end if;
end $$;

-- Allow owners to update/delete their own objects in photos bucket
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owner update photos'
  ) then
    create policy "Owner update photos"
    on storage.objects for update to authenticated
    using (bucket_id = 'photos' and owner = auth.uid())
    with check (bucket_id = 'photos' and owner = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Owner delete photos'
  ) then
    create policy "Owner delete photos"
    on storage.objects for delete to authenticated
    using (bucket_id = 'photos' and owner = auth.uid());
  end if;
end $$;


