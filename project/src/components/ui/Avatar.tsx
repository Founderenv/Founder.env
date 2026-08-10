import { cn } from '@/utils/format';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
}

const sizeMap = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-20 w-20',
  '2xl': 'h-28 w-28',
};

export function Avatar({ src, alt, size = 'md', className, ring }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'rounded-full object-cover bg-gray-100 dark:bg-gray-800',
        sizeMap[size],
        ring && 'ring-2 ring-white dark:ring-gray-950',
        className
      )}
      loading="lazy"
    />
  );
}
