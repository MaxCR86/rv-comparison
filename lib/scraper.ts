import axios from 'axios';

const RENO_COORDS = { lat: 39.5296, lng: -119.8138 };

export async function calculateDistance(location: string): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: location,
        key: apiKey,
      },
    });

    if (!response.data.results.length) {
      return 999;
    }

    const { lat, lng } = response.data.results[0].geometry.location;
    return haversineDistance(RENO_COORDS.lat, RENO_COORDS.lng, lat, lng);
  } catch (error) {
    console.error('Geocoding error:', error);
    return 999;
  }
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
