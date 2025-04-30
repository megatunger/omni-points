export interface Voucher {
  id: string;
  brand: string;
  name: string;
  validFrom: Date;
  validTo: Date;
  thumbnailUrl: string;
  points: number;
  conditions?: string;
  isRedeemed?: boolean;
  discountCode?: string;
}