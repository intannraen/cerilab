import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src?: string;
  title: string;
  author?: string;
  category?: string;
  className?: string;
}

export function BookCover({
  src,
  title,
  author,
  category,
  className = '',
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-[#F4EAE6] via-[#FAF6F2] to-[#EBDAD4] border border-[#EADFD9] flex flex-col justify-between p-5 text-[#2A1A1F] ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] font-medium tracking-wide text-[#8F2D45]">
          <span className="truncate">{category || 'Koleksi'}</span>
          <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-75" />
        </div>
        <div className="my-auto">
          <div className="w-8 h-[1.5px] bg-[#8F2D45] mb-3" />
          <p className="font-display text-base font-semibold leading-snug line-clamp-3">
            {title}
          </p>
          {author && (
            <p className="mt-1.5 text-xs text-[#6E585F] line-clamp-1">{author}</p>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-[#6E585F]">
          <span>CeriLib</span>
          <span aria-hidden="true">·</span>
          <span>Digital</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden bg-[#F3EAE6] border border-[#EADFD9] ${className}`}
    >
      <img
        src={src}
        alt={`Sampul buku ${title}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
      />
    </div>
  );
}
