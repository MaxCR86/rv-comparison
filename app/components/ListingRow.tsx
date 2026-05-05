'use client';

import { useState, useEffect } from 'react';
import { RVListing, Comment } from '@/types';
import ImageGallery from './ImageGallery';
import CommentForm from './CommentForm';

interface ListingRowProps {
  listing: RVListing;
  columns: string[];
  onVote: (id: string, direction: 1 | -1) => void;
  onRefresh: () => void;
}

export default function ListingRow({
  listing,
  columns,
  onVote,
  onRefresh,
}: ListingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showAdCopy, setShowAdCopy] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchComments();
    }
  }, [expanded]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/listings/${listing.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const getCellValue = (column: string) => {
    switch (column) {
      case 'Year':
        return listing.year;
      case 'Price':
        return `$${listing.price?.toLocaleString()}`;
      case 'Location':
        return listing.location;
      case 'Distance':
        return `${listing.distance_miles} mi`;
      case 'Published':
        return new Date(listing.published_date).toLocaleDateString();
      case 'Rating':
        return listing.rating;
      default:
        return '';
    }
  };

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-center">
          <button onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}>
            {expanded ? '▼' : '▶'}
          </button>
        </td>
        {columns.map((col) => (
          <td key={col} className="px-4 py-3">
            {getCellValue(col)}
          </td>
        ))}
      </tr>

      {expanded && (
        <tr>
          <td colSpan={columns.length + 1} className="px-4 py-4 bg-gray-50">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Photos</h3>
                <ImageGallery photoPaths={listing.photo_paths} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Seller Name</p>
                  <p className="font-semibold">{listing.seller_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-semibold">{listing.seller_contact || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Rating</p>
                  <p className="text-2xl font-bold">{listing.rating}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVote(listing.id, 1);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  >
                    ▲ Upvote
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVote(listing.id, -1);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                  >
                    ▼ Downvote
                  </button>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setShowAdCopy(!showAdCopy)}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  {showAdCopy ? '▼ Hide Ad Copy' : '▶ Show Ad Copy'}
                </button>
                {showAdCopy && (
                  <div className="mt-2 p-3 bg-white border rounded whitespace-pre-wrap text-sm">
                    {listing.ad_copy}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-3">Comments</h3>
                <div className="space-y-3 mb-4">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border rounded p-3 bg-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{comment.commenter_name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(comment.created_at).toLocaleString()}
                            </p>
                          </div>
                          {comment.is_deletion_request && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Deletion Request
                            </span>
                          )}
                        </div>
                        <p className="mt-2">{comment.text}</p>
                        {comment.deletion_reason_type && (
                          <p className="text-sm text-gray-600 mt-1">
                            Reason: {comment.deletion_reason_type.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <CommentForm
                  listingId={listing.id}
                  onCommentAdded={() => {
                    fetchComments();
                    onRefresh();
                  }}
                />
              </div>

              <div>
                <a
                  href={listing.fb_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View original listing →
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
