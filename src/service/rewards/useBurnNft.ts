import { useMutation, useQueryClient } from "@tanstack/react-query";
import { publicKey } from "@metaplex-foundation/umi";
import {
  burnV1,
  fetchDigitalAsset,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { umi } from "@/utils/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { useFetchRewardsKey } from "@/service/rewards/useFetchRewards";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

function useBurnNft(address: string) {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { publicKey: walletAdress } = wallet;
      if (!walletAdress) {
        throw new Error("Invalid params");
      }
      umi.use(walletAdapterIdentity(wallet));

      const assetId = publicKey(address);
      const asset = await fetchDigitalAsset(umi, assetId);
      const txb = await burnV1(umi, {
        mint: publicKey(asset.mint),
        tokenStandard: TokenStandard.NonFungible,
      });
      const txSig = await txb.sendAndConfirm(umi);

      await queryClient.invalidateQueries({
        queryKey: useFetchRewardsKey,
        exact: false,
      });
    },
  });
}

export default useBurnNft;
