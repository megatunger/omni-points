'use client';

import { useState, useMemo } from 'react';
import { VoucherCard } from '@/components/voucher/voucher-card';
import { FilterBar } from '@/components/marketplace/filter-bar';
import { Voucher } from '@/types/voucher';
import toast from 'react-hot-toast';

// Mock data - Replace this with actual API call
const mockVouchers: Voucher[] = [
  {
    id: '1',
    brand: 'Starbucks',
    name: '$10 Coffee Voucher',
    validFrom: new Date('2025-04-28'),
    validTo: new Date('2025-05-28'),
    thumbnailUrl: 'https://www.cartridgesave.co.uk/printwhatmatters/wp-content/uploads/2021/11/ssv-blank-1024x511.png',
    points: 1000,
    conditions: 'Valid for one-time use only. Cannot be combined with other offers.',
  },
  {
    id: '2',
    brand: 'Amazon',
    name: '$20 Shopping Voucher',
    validFrom: new Date('2025-04-28'),
    validTo: new Date('2025-06-28'),
    thumbnailUrl: 'https://www.cartridgesave.co.uk/printwhatmatters/wp-content/uploads/2021/11/ssv-blank-1024x511.png',
    points: 2000,
    conditions: 'Valid for one-time use only. Cannot be combined with other offers.',
  },
  // Add more vouchers as needed
];


export default function MarketplacePage() {
  const [filters, setFilters] = useState({
    brand: '',
    sortBy: 'name', // 'name' | 'points'
    sortOrder: 'asc' as 'asc' | 'desc',
  });

  const handleBuyVoucher = async (voucherId: string) => {
    try {
      // Add your buy logic here
      toast.success('Voucher purchased successfully!');
    } catch (error) {
      toast.error('Failed to purchase voucher');
    }
  };

  const filteredVouchers = useMemo(() => {
    let result = [...mockVouchers];

    // Apply brand filter
    if (filters.brand) {
      result = result.filter(v =>
        v.brand.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      if (filters.sortBy === 'name') {
        return order * a.name.localeCompare(b.name);
      }
      return order * (a.points - b.points);
    });

    return result;
  }, [filters, mockVouchers]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Rewards Marketplace</h1>

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          availableBrands={[...new Set(mockVouchers.map(v => v.brand))]}
        />

        {filteredVouchers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-600">
              No vouchers found matching your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                isOwned={false}
                onBuy={handleBuyVoucher}
                onSell={() => { }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}