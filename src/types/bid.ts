import { Voucher } from './voucher';

export interface Offer {
  id: string;
  bidder: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface VoucherBidding {
  minimumPrice: number;
  maximumPrice: number;
  offers: Offer[];
  // status: 'open' | 'closed' | 'sold';
}
