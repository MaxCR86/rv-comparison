import { createClient } from '@supabase/supabase-js';

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getMaxRating() {
  const { data, error } = await supabaseServer
    .from('rv_listings')
    .select('rating')
    .order('rating', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.rating ?? 0;
}

export async function uploadPhoto(bucket: string, path: string, file: Buffer) {
  const { data, error } = await supabaseServer.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return data;
}
