import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { CommentPayload } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as CommentPayload;
    const { commenter_name, text, is_deletion_request, deletion_reason_type } = body;

    if (!commenter_name || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer.from('comments').insert([
      {
        listing_id: params.id,
        commenter_name,
        text,
        is_deletion_request: is_deletion_request || false,
        deletion_reason_type: deletion_reason_type || null,
      },
    ]);

    if (error) throw error;

    return NextResponse.json(data?.[0] || { success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseServer
      .from('comments')
      .select('*')
      .eq('listing_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
