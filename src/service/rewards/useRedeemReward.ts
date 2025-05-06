import { axios } from "@/utils/constants";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useFetchRewardsKey } from "@/service/rewards/useFetchRewards";

export type useRedeemRewardType = {
  instructions: string;
  metadata: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBps: number;
    creators: {
      __option: string;
      value: Array<{
        address: string;
        verified: boolean;
        share: number;
      }>;
    };
  };
};

function useRedeemReward(address: string) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const connection = useConnection();
  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<useRedeemRewardType>(
        "/rewards/redeem",
        {
          walletAddress: publicKey?.toString(),
          nftAddress: address,
        },
      );
      const instructions = Buffer.from(data.instructions, "base64");
      const transaction = Transaction.from(instructions);
      // const tx = await signTransaction?.(transaction);
      try {
        const txSig = await sendTransaction(
          transaction!,
          connection.connection,
        );
        // Display tx on solana explorer
        const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;

        console.log(txSig);
        window.open(explorerUrl, "_blank");
        queryClient.invalidateQueries({
          queryKey: useFetchRewardsKey,
        });
      } catch (error) {
        console.log(error);
      }
    },
  });
}

export default useRedeemReward;
