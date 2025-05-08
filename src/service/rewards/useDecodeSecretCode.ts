import { useQuery } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { axios } from "@/utils/constants";

function useDecodeSecretCode(address: string) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const connection = useConnection();
  return useQuery({
    queryKey: ["secret-code", address],
    queryFn: async () => {
      return await axios.post<any>("/rewards/reveal", {
        walletAddress: publicKey?.toString(),
        nftAddress: address.toString(),
      });
    },
  });
}

export default useDecodeSecretCode;
