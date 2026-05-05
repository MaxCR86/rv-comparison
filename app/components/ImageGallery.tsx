'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface ImageGalleryProps {
  photoPaths: string[];
}

export default function ImageGallery({ photoPaths }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photoPaths || photoPaths.length === 0) {
    return <div className="w-full h-48 bg-gray-200 flex items-center justify-center">No images</div>;
  }

  const currentPath = photoPaths[currentIndex];
  const { data } = supabase.storage.from('rv-photos').getPublicUrl(currentPath);
  const imageUrl = data.publicUrl;

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % photoPaths.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + photoPaths.length) % photoPaths.length);
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-64 bg-gray-100">
        <Image
          src={imageUrl}
          alt="RV listing image"
          fill
          className="object-cover"
        />
        {photoPaths.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded"
            >
              ←
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded"
            >
              →
            </button>
          </>
        )}
      </div>

      {photoPaths.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photoPaths.map((path, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 border-2 ${
                index === currentIndex ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={supabase.storage.from('rv-photos').getPublicUrl(path).data.publicUrl}
                  alt="thumbnail"
                  fill
                  className="object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
