import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { OptToken } from "@/utils/constants";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

type Response = {
  address: PublicKey;
  mint: PublicKey;
  amount: number;
};

function useFetchCurrentVikkiToken() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const walletAddress = publicKey;
  return useQuery<Response | undefined>({
    queryKey: ["token", walletAddress?.toString()],
    enabled: !!walletAddress?.toString(),
    queryFn: async () => {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletAddress!,
        {
          programId: TOKEN_2022_PROGRAM_ID,
        },
      );

      for (const { pubkey, account } of tokenAccounts.value) {
        const info = account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount.uiAmount;

        if (amount && amount > 0 && mint === OptToken.toString()) {
          return {
            address: pubkey,
            mint: mint,
            amount: amount,
          };
        }
      }
      throw new Error("No Vikki token found");
    },
  });
}

export default useFetchCurrentVikkiToken;
