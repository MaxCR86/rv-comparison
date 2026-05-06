import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getMaxRating, uploadPhoto } from '@/lib/supabase-server';
import { scrapeFacebookMarketplace } from '@/lib/fb-scraper';
import { calculateDistance } from '@/lib/scraper';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseServer
      .from('rv_listings')
      .select('*')
      .order('rating', { ascending: true });

    if (error) throw error;

    const listings = (data as any[]).map((listing) => ({
      ...listing,
      photo_paths: Array.isArray(listing.photo_paths)
        ? listing.photo_paths
        : JSON.parse(listing.photo_paths || '[]'),
    }));

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fb_url, password } = body;

    if (password !== process.env.NEXT_PUBLIC_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const scrapedData = await scrapeFacebookMarketplace(fb_url);

    // Validate extracted data before storing
    if (scrapedData.seller_name.length > 200 || /[{}[\]"\\]/g.test(scrapedData.seller_name)) {
      scrapedData.seller_name = 'Unknown Seller';
    }
    if (scrapedData.location.includes('is approximate') || scrapedData.location.length > 100) {
      scrapedData.location = 'Unknown';
    }
    if (scrapedData.price === 0 || scrapedData.price === 1) {
      scrapedData.price = 0;
    }

    const distance_miles = await calculateDistance(scrapedData.location);
    const maxRating = await getMaxRating();
    const newRating = maxRating + 1;

    const photoUrls: string[] = [];
    const listingId = uuidv4();

    for (let i = 0; i < scrapedData.photo_urls.length; i++) {
      try {
        const photoUrl = scrapedData.photo_urls[i];
        const photoResponse = await fetch(photoUrl);
        const photoBuffer = await photoResponse.arrayBuffer();
        const fileName = `${listingId}/${i}.jpg`;

        await uploadPhoto('rv-photos', fileName, Buffer.from(photoBuffer));
        photoUrls.push(fileName);
      } catch (error) {
        console.error(`Failed to download photo ${i}:`, error);
      }
    }

    const { data, error } = await supabaseServer.from('rv_listings').insert([
      {
        id: listingId,
        fb_url,
        year: scrapedData.year,
        price: scrapedData.price,
        location: scrapedData.location,
        distance_miles,
        seller_name: scrapedData.seller_name,
        seller_contact: scrapedData.seller_contact,
        ad_copy: scrapedData.ad_copy,
        published_date: scrapedData.published_date,
        photo_paths: photoUrls,
        rating: newRating,
      },
    ]);

    if (error) throw error;

    return NextResponse.json(data?.[0] || { id: listingId, success: true }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error adding listing:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to add listing', details: errorMessage },
      { status: 500 }
    );
  }
}
