import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import useFetchCurrentVikkiToken from "@/service/token/useFetchCurrentVikkiToken";

function useEligibleToBuy(amount: number) {
  const { publicKey } = useWallet();
  const { data: currentTokens } = useFetchCurrentVikkiToken();
  const walletAddress = publicKey;

  return useQuery({
    queryKey: ["eligibleToBuy", walletAddress?.toString(), amount],
    queryFn: async () => {
      if (!walletAddress?.toBase58() || !currentTokens) {
        return false;
      }
      if (amount > currentTokens.amount) {
        return false;
      }
      return true;
    },
  });
}

export default useEligibleToBuy;
