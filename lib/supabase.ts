import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchListings() {
  const { data, error } = await supabase
    .from('rv_listings')
    .select('*')
    .order('rating', { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchComments(listingId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPhotoUrl(path: string) {
  const { data } = supabase.storage
    .from('rv-photos')
    .getPublicUrl(path);
  return data.publicUrl;
}
