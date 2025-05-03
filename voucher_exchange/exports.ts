import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import VoucherExchangeIDL from "./target/idl/voucher_exchange.json";
import { VoucherExchange } from "./target/types/voucher_exchange";

export { VoucherExchangeIDL, type VoucherExchange };

export const VOUCHER_EXCHANGE_PROGRAM_ID = new PublicKey(
  VoucherExchangeIDL.address,
);

export function getVoucherExchangeProgram(provider: AnchorProvider) {
  return new Program(VoucherExchangeIDL as VoucherExchange, provider);
}
