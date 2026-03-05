import { IndustryTile } from './IndustryTile';
import type { IndustryType } from '@/types';
import { industryCatalog } from '@/lib/industryCatalog';

interface IndustrySelectorProps {
  onSelect: (id: IndustryType) => void;
  selectedId: IndustryType | null;
  readOnly?: boolean;
  showTitle?: boolean;
  compact?: boolean;
}

export function IndustrySelector({
  onSelect,
  selectedId,
  readOnly = false,
  showTitle = !readOnly,
  compact = false,
}: IndustrySelectorProps) {
  const handleSelect = (id: IndustryType) => {
    if (!readOnly) {
      onSelect(id);
    }
  };

  const visibleIndustries =
    readOnly && selectedId
      ? industryCatalog.filter((industry) => industry.id === selectedId)
      : industryCatalog;

  return (
    <div className={compact ? 'w-full' : 'mx-auto w-full max-w-7xl px-6 py-8'}>
      {showTitle && !readOnly && (
        <h2 className="mb-6 text-2xl font-bold text-white">Select Industry</h2>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {visibleIndustries.map((industry) => (
          <IndustryTile
            key={industry.id}
            id={industry.id}
            name={industry.name}
            subtitle={industry.subtitle}
            icon={industry.icon}
            color={industry.color}
            isSelected={industry.id === selectedId}
            onClick={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
