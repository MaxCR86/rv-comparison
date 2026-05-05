import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { direction } = body;

    if (direction !== 1 && direction !== -1) {
      return NextResponse.json(
        { error: 'Invalid vote direction' },
        { status: 400 }
      );
    }

    const { data: listing, error: fetchError } = await supabaseServer
      .from('rv_listings')
      .select('rating')
      .eq('id', params.id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    const newRating = listing.rating + direction;

    const { data, error } = await supabaseServer
      .from('rv_listings')
      .update({ rating: newRating })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    );
  }
}
