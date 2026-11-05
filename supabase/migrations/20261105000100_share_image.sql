-- Link preview image (Open Graph): what shows when the portal's link is shared.
-- Falls back to the banner when not set. Set in Blueprint › Look & feel.
alter table public.community_settings
  add column share_image_url text check (length(share_image_url) <= 1000);
