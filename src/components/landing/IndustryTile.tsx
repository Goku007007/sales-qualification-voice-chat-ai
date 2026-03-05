import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { IndustryType } from '@/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface IndustryTileProps {
  id: IndustryType;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  isSelected: boolean;
  onClick: (id: IndustryType) => void;
}

export function IndustryTile({
  id,
  name,
  subtitle,
  icon: Icon,
  color,
  isSelected,
  onClick,
}: IndustryTileProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        'relative flex h-full w-full flex-col items-start gap-3 rounded-xl border px-4 py-4 text-left transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        isSelected
          ? 'bg-slate-800/90 shadow-[0_0_22px_rgba(59,130,246,0.22)]'
          : 'bg-slate-900/55 hover:bg-slate-800/70',
      )}
      style={{
        borderColor: isSelected ? `${color}CC` : 'rgba(71,85,105,0.65)',
      }}
      aria-pressed={isSelected}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: `${color}1F`,
          borderColor: `${color}55`,
          color,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="space-y-0.5">
        <h3 className="text-xl font-semibold leading-6 text-slate-100">{name}</h3>
        <p className="max-w-[180px] text-sm leading-snug text-slate-300">{subtitle}</p>
      </div>
    </button>
  );
}
