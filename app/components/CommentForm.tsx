'use client';

import { useState, useEffect } from 'react';

interface CommentFormProps {
  listingId: string;
  onCommentAdded: () => void;
}

const DELETION_REASONS = [
  'no_longer_relevant',
  'too_far',
  'other',
];

export default function CommentForm({ listingId, onCommentAdded }: CommentFormProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isDeletionRequest, setIsDeletionRequest] = useState(false);
  const [deletionReason, setDeletionReason] = useState('no_longer_relevant');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('commenter_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !text.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      localStorage.setItem('commenter_name', name);

      const response = await fetch(`/api/listings/${listingId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commenter_name: name,
          text,
          is_deletion_request: isDeletionRequest,
          deletion_reason_type: isDeletionRequest ? deletionReason : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setText('');
      onCommentAdded();
    } catch (error) {
      alert('Error adding comment');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t pt-4 mt-4">
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          placeholder="Your comment"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border px-3 py-2 rounded h-24"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDeletionRequest}
            onChange={(e) => setIsDeletionRequest(e.target.checked)}
          />
          <span>Request deletion</span>
        </label>

        {isDeletionRequest && (
          <select
            value={deletionReason}
            onChange={(e) => setDeletionReason(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            {DELETION_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
