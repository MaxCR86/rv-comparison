import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseServer.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json({ error: 'Failed to list buckets' }, { status: 500 });
    }

    const bucketExists = buckets?.some(b => b.name === 'rv-photos');

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabaseServer.storage.createBucket('rv-photos', {
        public: true,
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json({ error: 'Failed to create bucket' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Storage initialized successfully' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Init error:', errorMessage);
    return NextResponse.json({ error: 'Failed to initialize' }, { status: 500 });
  }
}
