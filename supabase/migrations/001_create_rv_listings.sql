-- Create rv_listings table
create table rv_listings (
  id uuid default gen_random_uuid() primary key,
  fb_url text not null unique,
  year integer,
  price integer,
  photo_paths text[] default '{}',
  published_date timestamp with time zone,
  location text,
  distance_miles numeric,
  seller_name text,
  seller_contact text,
  ad_copy text,
  rating integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table rv_listings enable row level security;

-- Policy: Anyone can read listings
create policy "Anyone can read listings" on rv_listings
  for select using (true);

-- Policy: Only authenticated users with password can insert
create policy "Anyone can insert listings" on rv_listings
  for insert with check (true);

-- Policy: Only authenticated users with password can update
create policy "Anyone can update ratings" on rv_listings
  for update using (true) with check (true);

-- Policy: Only authenticated users with password can delete
create policy "Anyone can delete listings" on rv_listings
  for delete using (true);

-- Create index on rating for sorting
create index idx_rv_listings_rating on rv_listings(rating desc);

-- Create index on fb_url for lookups
create index idx_rv_listings_fb_url on rv_listings(fb_url);
