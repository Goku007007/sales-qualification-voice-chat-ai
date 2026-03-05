import Image from 'next/image';

interface BrandMarkProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandMark({ size = 36, className, priority = false }: BrandMarkProps) {
  return (
    <Image
      src="/brand-mark.svg"
      alt="Sales Qualification AI logo"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
