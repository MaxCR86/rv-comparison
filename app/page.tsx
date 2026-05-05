'use client';

import { useState, useEffect } from 'react';
import { RVListing } from '@/types';
import ListingsTable from './components/ListingsTable';

export default function HomePage() {
  const [listings, setListings] = useState<RVListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings');
      if (response.ok) {
        const data = await response.json();
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">RV Comparison</h1>
            <p className="text-gray-600">Compare RV trailers from Facebook Marketplace</p>
          </div>
          <a
            href="/edit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
          >
            Add New RV (Edit)
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <ListingsTable listings={listings} onRefresh={fetchListings} />
        )}
      </main>
    </div>
  );
}
