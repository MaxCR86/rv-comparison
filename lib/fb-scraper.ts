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

    const year = extractYear(html);
    const price = extractPrice(html);
    const location = extractLocation(html);
    const seller_name = extractSellerName(html);
    const seller_contact = extractSellerContact(html);
    const ad_copy = extractAdCopy(html);
    const published_date = extractPublishedDate(html);
    const photo_urls = extractPhotoUrls(html);

    return {
      year,
      price,
      location,
      seller_name,
      seller_contact,
      ad_copy,
      published_date,
      photo_urls,
    };
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error('Failed to scrape marketplace listing');
  }
}

function extractYear(html: string): number {
  const match = html.match(/(\d{4})\s*(RV|trailer|rv)/i);
  return match ? parseInt(match[1]) : new Date().getFullYear();
}

function extractPrice(html: string): number {
  const match = html.match(/\$[\d,]+/);
  return match ? parseInt(match[0].replace(/[^\d]/g, '')) : 0;
}

function extractLocation(html: string): string {
  const match = html.match(/(?:Location|location)[\s:]*([^<\n]+)/);
  return match ? match[1].trim() : 'Unknown';
}

function extractSellerName(html: string): string {
  const match = html.match(/(?:Seller|seller)[\s:]*([^<\n]+)/);
  return match ? match[1].trim() : 'Unknown Seller';
}

function extractSellerContact(html: string): string {
  return '';
}

function extractAdCopy(html: string): string {
  const match = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
  return match ? match[1] : '';
}

function extractPublishedDate(html: string): string {
  return new Date().toISOString();
}

function extractPhotoUrls(html: string): string[] {
  const matches = html.match(/https:\/\/[^\s"<>]+\.(jpg|png|webp)/gi);
  return matches?.slice(0, 10) || [];
}
