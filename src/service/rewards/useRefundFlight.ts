import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axios } from "@/utils/constants";
import { useRedeemRewardType } from "@/service/rewards/useRedeemReward";
import { Transaction } from "@solana/web3.js";
import { useFetchRewardsKey } from "@/service/rewards/useFetchRewards";
import useBurnNft from "@/service/rewards/useBurnNft";

function useRefundFlight(address: string) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const connection = useConnection();
  const { mutateAsync: burnNft } = useBurnNft(address);

  return useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<useRedeemRewardType>(
        "/rewards/refund",
        {
          walletAddress: publicKey?.toString(),
          nftAddress: address,
        },
      );
      if (data?.error) {
        alert(data?.error);
        return;
      }
      const instructions = Buffer.from(data.instructions, "base64");
      const transaction = Transaction.from(instructions);
      console.log(transaction);
      const txSig = await connection.connection.sendRawTransaction(
        transaction.serialize()!,
      );
      await burnNft();
      // Display tx on solana explorer
      const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;
      console.log(txSig, explorerUrl);
      // window.open(explorerUrl, "_blank");
      await queryClient.invalidateQueries({
        queryKey: useFetchRewardsKey,
        exact: false,
      });
    },
  });
}

export default useRefundFlight;
