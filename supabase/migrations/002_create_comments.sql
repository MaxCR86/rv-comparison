-- Create comments table
create table comments (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references rv_listings(id) on delete cascade,
  commenter_name text not null,
  text text not null,
  is_deletion_request boolean default false,
  deletion_reason_type text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table comments enable row level security;

-- Policy: Anyone can read comments
create policy "Anyone can read comments" on comments
  for select using (true);

-- Policy: Anyone can insert comments
create policy "Anyone can insert comments" on comments
  for insert with check (true);

-- Policy: Anyone can update comments
create policy "Anyone can update comments" on comments
  for update using (true) with check (true);

-- Policy: Anyone can delete comments
create policy "Anyone can delete comments" on comments
  for delete using (true);

-- Create index on listing_id for fast lookups
create index idx_comments_listing_id on comments(listing_id);

-- Create index on created_at for sorting
create index idx_comments_created_at on comments(created_at desc);
