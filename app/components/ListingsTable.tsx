'use client';

import { useState, useEffect } from 'react';
import { RVListing } from '@/types';
import ListingRow from './ListingRow';

interface ListingsTableProps {
  listings: RVListing[];
  onRefresh: () => void;
}

const DEFAULT_COLUMNS = ['Year', 'Price', 'Location', 'Distance', 'Published', 'Rating'];

export default function ListingsTable({ listings, onRefresh }: ListingsTableProps) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('column_order');
    if (saved) {
      setColumns(JSON.parse(saved));
    }
  }, []);

  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumn) return;

    const newColumns = [...columns];
    const draggedIndex = newColumns.indexOf(draggedColumn);
    const targetIndex = newColumns.indexOf(targetColumn);

    newColumns[draggedIndex] = targetColumn;
    newColumns[targetIndex] = draggedColumn;

    setColumns(newColumns);
    localStorage.setItem('column_order', JSON.stringify(newColumns));
  };

  const handleVote = async (id: string, direction: 1 | -1) => {
    try {
      const response = await fetch(`/api/listings/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="px-4 py-2 text-left"></th>
            {columns.map((col) => (
              <th
                key={col}
                draggable
                onDragStart={() => handleDragStart(col)}
                onDragOver={(e) => handleDragOver(e, col)}
                onDragEnd={() => setDraggedColumn(null)}
                className="px-4 py-2 text-left cursor-move hover:bg-gray-200 select-none"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {listings.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-4 text-center text-gray-500">
                No listings yet. Go to /edit to add one.
              </td>
            </tr>
          ) : (
            listings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                columns={columns}
                onVote={handleVote}
                onRefresh={onRefresh}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
