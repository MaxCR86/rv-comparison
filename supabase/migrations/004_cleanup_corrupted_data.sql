-- Clean up corrupted seller names and location data
-- This migration fixes existing database records that contain invalid extracted data

-- Fix corrupted seller names containing suspicious patterns (JSON, code, metadata)
UPDATE rv_listings
SET seller_name = 'Unknown Seller'
WHERE
  seller_name LIKE '%{%' OR
  seller_name LIKE '%}%' OR
  seller_name LIKE '%[%' OR
  seller_name LIKE '%]%' OR
  seller_name LIKE '%"%%' OR
  seller_name LIKE '%\\%' OR
  LENGTH(seller_name) > 200 OR
  seller_name ILIKE '%using meta%' OR
  seller_name ILIKE '%cookie%' OR
  seller_name ILIKE '%config%';

-- Fix locations that have 'is approximate' or exceed reasonable length
UPDATE rv_listings
SET location = 'Unknown'
WHERE
  location LIKE '%is approximate%' OR
  LENGTH(location) > 100;

-- Fix prices that are 0 or 1 (indicators of extraction failure)
UPDATE rv_listings
SET price = 0
WHERE price = 1;
