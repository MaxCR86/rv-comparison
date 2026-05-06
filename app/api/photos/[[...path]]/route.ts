import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const photoPath = params.path.join('/');

    if (!photoPath) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    // Generate signed URL valid for 1 hour
    const { data, error } = await supabaseServer.storage
      .from('rv-photos')
      .createSignedUrl(photoPath, 3600);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to generate signed URL', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
