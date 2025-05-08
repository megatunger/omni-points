import { useMutation, useQueryClient } from "@tanstack/react-query";
import { umi } from "@/utils/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  generateSigner,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  createNft,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import bs58 from "bs58";
import { useFetchRewardsKey } from "@/service/rewards/useFetchRewards";
import useBurnNft from "@/service/rewards/useBurnNft";

function useRevealCode(address: string) {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const connection = useConnection();
  const { mutateAsync: burnNft } = useBurnNft(address);
  return useMutation({
    mutationFn: async () => {
      const { publicKey: walletAdress } = wallet;
      if (!walletAdress) {
        throw new Error("Invalid params");
      }
      const assetId = publicKey(address);
      const asset = await fetchDigitalAsset(umi, assetId);
      const nftDetail = asset.metadata;

      umi.use(walletAdapterIdentity(wallet));
      const mint = generateSigner(umi);
      const txMintReceipt = await createNft(umi, {
        mint,
        name: "RECEIPT_" + nftDetail.name,
        uri: nftDetail.uri,
        sellerFeeBasisPoints: percentAmount(0),
        creators: [
          {
            address: publicKey(walletAdress),
            verified: true,
            share: 100,
          },
        ],
        // @ts-ignore
      }).sendAndConfirm(umi);

      const explorerMintReceiptUrl = `https://explorer.solana.com/tx/${bs58.encode(txMintReceipt.signature)}?cluster=devnet`;
      console.log(`Explorer URL: ${explorerMintReceiptUrl}`);
      // window.open(explorerMintReceiptUrl, "_blank");

      await burnNft();
      await queryClient.invalidateQueries({
        queryKey: useFetchRewardsKey,
        exact: false,
      });
    },
  });
}

export default useRevealCode;
