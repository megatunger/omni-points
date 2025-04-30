'use client';

import { useState } from 'react';
import { VoucherCard } from '@/components/voucher/voucher-card';
import { Voucher } from '@/types/voucher';
import toast from 'react-hot-toast';

const mockMyVouchers: Voucher[] = [
  {
    id: '1',
    brand: 'VietJet',
    name: '$10 Ticket Voucher',
    validFrom: new Date('2025-04-28'),
    validTo: new Date('2025-05-28'),
    thumbnailUrl: 'https://www.cartridgesave.co.uk/printwhatmatters/wp-content/uploads/2021/11/ssv-blank-1024x511.png',
    points: 1000,
    conditions: 'Valid for one-time use only. Cannot be combined with other offers.',
    isRedeemed: false,
  },
  {
    id: '2',
    brand: 'Pizza Hut',
    name: '$1 Drink Voucher',
    validFrom: new Date('2025-05-18'),
    validTo: new Date('2025-07-20'),
    thumbnailUrl: 'https://www.cartridgesave.co.uk/printwhatmatters/wp-content/uploads/2021/11/ssv-blank-1024x511.png',
    points: 2000,
    conditions: 'Valid for one-time use only. Cannot be combined with other offers.',
    isRedeemed: true,
    discountCode: 'PIZZA123',
  },
  // Add more vouchers as needed
];

export default function RewardsPage() {
  const [myVouchers, setMyVouchers] = useState<Voucher[]>(mockMyVouchers);
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('my');

  const handleSellVoucher = async (voucherId: string) => {
    try {
      // Add your selling logic here
      toast.success('Voucher sold successfully!');
    } catch (error) {
      toast.error('Failed to sell voucher');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">My Rewards</h1>

        {/* Vouchers List */}
        {myVouchers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-gray-600">You don't have any vouchers yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.id}
                voucher={voucher}
                isOwned={true}
                onSell={handleSellVoucher}
                onBuy={() => { }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}