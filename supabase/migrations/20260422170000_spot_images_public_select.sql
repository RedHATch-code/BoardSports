drop policy if exists spot_images_select_owner_only on public.spot_images;
drop policy if exists spot_images_select_visible on public.spot_images;

create policy spot_images_select_visible on public.spot_images
for select using (
  exists (
    select 1
    from public.spots s
    where s.id = spot_images.spot_id
      and (s.visibility <> 'private' or s.owner_id = auth.uid())
  )
);
