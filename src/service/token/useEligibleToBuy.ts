import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import useFetchCurrentVikkiToken from "@/service/token/useFetchCurrentVikkiToken";
import useFetchRewards from "@/service/rewards/useFetchRewards";

function useEligibleToBuy(amount: number, address?: string) {
  const { data: currentTokens } = useFetchCurrentVikkiToken();
  const { publicKey, connected } = useWallet();
  const { data: currentOwned } = useFetchRewards({
    address: publicKey?.toString(),
  });
  const walletAddress = publicKey;

  return useQuery({
    queryKey: ["eligibleToBuy", walletAddress?.toString(), amount, address],
    queryFn: async () => {
      const currentOwnedAddresses = currentOwned?.map((e) => e.address);
      if (currentOwnedAddresses?.includes(address!)) {
        return "owned";
      }
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
