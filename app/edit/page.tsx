'use client';

import { useState, useEffect } from 'react';
import { RVListing } from '@/types';
import PasswordPrompt from '@/app/components/PasswordPrompt';
import AddListingForm from '@/app/components/AddListingForm';

export default function EditPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
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

  const handlePasswordSuccess = () => {
    setPassword(process.env.NEXT_PUBLIC_PASSWORD || '');
    setAuthenticated(true);
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const response = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        fetchListings();
        alert('Listing deleted');
      }
    } catch (error) {
      alert('Error deleting listing');
      console.error(error);
    }
  };

  if (!authenticated) {
    return (
      <PasswordPrompt
        onSuccess={handlePasswordSuccess}
        onCancel={() => (window.location.href = '/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Edit RV Listings</h1>
          <a
            href="/"
            className="text-blue-600 hover:underline font-semibold"
          >
            ← Back to List
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <AddListingForm
          password={password}
          onListingAdded={fetchListings}
        />

        <div>
          <h2 className="text-2xl font-bold mb-4">Manage Listings</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg shadow">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left">Year</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Rating</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{listing.year}</td>
                      <td className="px-4 py-3">${listing.price?.toLocaleString()}</td>
                      <td className="px-4 py-3">{listing.location}</td>
                      <td className="px-4 py-3">{listing.rating}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
