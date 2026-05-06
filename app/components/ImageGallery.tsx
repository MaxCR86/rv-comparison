'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  photoPaths: string[];
}

export default function ImageGallery({ photoPaths }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (!photoPaths || photoPaths.length === 0) return;

      const currentPath = photoPaths[currentIndex];
      const response = await fetch(`/api/photos/${currentPath}`);
      const data = await response.json();
      setImageUrl(data.url || '');
    };

    fetchImageUrl();
  }, [currentIndex, photoPaths]);

  useEffect(() => {
    const fetchThumbnails = async () => {
      if (!photoPaths || photoPaths.length === 0) return;

      const urls = await Promise.all(
        photoPaths.map(async (path) => {
          const response = await fetch(`/api/photos/${path}`);
          const data = await response.json();
          return data.url || '';
        })
      );
      setThumbnailUrls(urls);
    };

    fetchThumbnails();
  }, [photoPaths]);

  if (!photoPaths || photoPaths.length === 0) {
    return <div className="w-full h-48 bg-gray-200 flex items-center justify-center">No images</div>;
  }

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

      {photoPaths.length > 1 && thumbnailUrls.length > 0 && (
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
                {thumbnailUrls[index] && (
                  <Image
                    src={thumbnailUrls[index]}
                    alt="thumbnail"
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
