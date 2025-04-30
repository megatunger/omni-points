import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';

interface FilterBarProps {
  filters: {
    brand: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  onFiltersChange: (filters: any) => void;
  availableBrands: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  availableBrands,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-6 p-6 bg-neutral rounded-xl shadow-lg">
      {/* Brand Filter */}
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-neutral-content/70 block mb-2">
          Brand
        </label>
        <select
          className="select select-bordered w-full bg-neutral-focus text-neutral-content"
          value={filters.brand}
          onChange={(e) => onFiltersChange({ ...filters, brand: e.target.value })}
        >
          <option value="">All Brands</option>
          {availableBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Controls */}
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium text-neutral-content/70 block mb-2">
          Sort by
        </label>
        <div className="flex gap-2">
          <select
            className="select select-bordered flex-1 bg-neutral-focus text-neutral-content"
            value={filters.sortBy}
            onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value })}
          >
            <option value="name">Name</option>
            <option value="points">Value</option>
          </select>
          <button
            className="btn btn-square btn-neutral-focus"
            onClick={() =>
              onFiltersChange({
                ...filters,
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
              })
            }
          >
            {filters.sortOrder === 'asc' ? (
              <IconSortAscending className="w-5 h-5" />
            ) : (
              <IconSortDescending className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};