import axios from 'axios';
import { ScrapedData } from '@/types';

export async function scrapeFacebookMarketplace(url: string): Promise<ScrapedData> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY!;

  try {
    const response = await axios.get('https://api.scrapingbee.com/api/v1', {
      params: {
        api_key: apiKey,
        url: url,
        render_javascript: 'true',
      },
    });

    const html = response.data;

    // Extract from the page
    let year = extractYear(html);
    let price = extractPrice(html);
    let location = extractLocation(html);
    let seller_name = extractSellerName(html);
    let ad_copy = extractAdCopy(html);
    let photo_urls = extractPhotoUrls(html);

    // If we got minimal data, try extracting from Open Graph metadata (useful for share links)
    if (!price || !location || !ad_copy) {
      const ogTitle = extractOpenGraphTag(html, 'og:title');
      const ogDesc = extractOpenGraphTag(html, 'og:description');
      const ogImage = extractOpenGraphTag(html, 'og:image');

      if (ogDesc && !ad_copy) ad_copy = ogDesc;
      if (ogImage && photo_urls.length === 0) photo_urls = [ogImage];

      // Try to extract price from title or description
      if (!price && ogTitle) {
        const priceMatch = ogTitle.match(/\$[\d,]+/);
        if (priceMatch) price = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
      }
      if (!price && ogDesc) {
        const priceMatch = ogDesc.match(/\$[\d,]+/);
        if (priceMatch) price = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
      }
    }

    return {
      year,
      price,
      location,
      seller_name,
      seller_contact: '',
      ad_copy,
      published_date: new Date().toISOString(),
      photo_urls,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Scraping error:', errorMsg);
    throw new Error(`Scraping failed: ${errorMsg}`);
  }
}

function extractOpenGraphTag(html: string, property: string): string {
  const regex = new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`, 'i');
  const match = html.match(regex);
  return match ? match[1] : '';
}

function extractYear(html: string): number {
  // Try to find year followed by RV/trailer keywords
  const match = html.match(/(\d{4})\s+(RV|trailer|camper|motorhome)/i);
  if (match) return parseInt(match[1]);

  // Try to find year in common patterns
  const yearMatch = html.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

function extractPrice(html: string): number {
  // Look for price in various formats: $1,234 or $1234
  const match = html.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? parseInt(match[0].replace(/[^\d]/g, '')) : 0;
}

function extractLocation(html: string): string {
  // Look for location in common patterns
  const patterns = [
    /(?:Location|location)[:\s]+([A-Za-z\s,]+?)(?:<|$)/,
    /(?:Located in|located in)[:\s]+([A-Za-z\s,]+?)(?:<|$)/,
    /([\w\s]+),\s*(?:Nevada|CA|AZ|UT|OR|WA|TX|FL)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }

  return 'Unknown';
}

function extractSellerName(html: string): string {
  const patterns = [
    /(?:Seller|seller)[:\s]+([^<\n]+)/,
    /(?:By|posted by)[:\s]+([^<\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }

  return 'Unknown Seller';
}

function extractAdCopy(html: string): string {
  // First try Open Graph description
  const ogDesc = extractOpenGraphTag(html, 'og:description');
  if (ogDesc) return ogDesc;

  // Try to extract from common patterns
  const match = html.match(/<div[^>]*description[^>]*>([^<]+)<\/div>/i);
  if (match) return match[1];

  return '';
}

function extractPhotoUrls(html: string): string[] {
  // Look for image URLs in various formats
  const patterns = [
    /https:\/\/[^\s"<>]+\.(?:jpg|png|webp|jpeg)/gi,
    /"image":"(https:\/\/[^"]+)"/gi,
  ];

  const urls = new Set<string>();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      urls.add(match[1] || match[0]);
    }
  }

  // Filter out tracking/analytics URLs
  return Array.from(urls)
    .filter(url => !url.includes('analytics') && !url.includes('tracking'))
    .slice(0, 10);
}
