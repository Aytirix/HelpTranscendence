// src/components/chat/Avatar.tsx
import React from 'react';

type Props = {
  src: string | null;
  alt: string;
};

export default function Avatar({ src, alt }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-10 h-10 rounded-full object-cover border-2 border-white"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
      {alt.charAt(0).toUpperCase()}
    </div>
  );
}
