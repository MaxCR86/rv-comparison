'use client';

import { useState } from 'react';

interface AddListingFormProps {
  password: string;
  onListingAdded: () => void;
}

export default function AddListingForm({ password, onListingAdded }: AddListingFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fb_url: url, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add listing');
      }

      setUrl('');
      onListingAdded();
      alert('Listing added successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Add New RV Listing</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Facebook Marketplace Link
          </label>
          <input
            type="url"
            placeholder="https://www.facebook.com/marketplace/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Add Listing'}
        </button>
      </div>
    </form>
  );
}
