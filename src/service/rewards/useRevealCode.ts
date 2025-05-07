import { useMutation } from "@tanstack/react-query";
import { axios, umi } from "@/utils/constants";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { publicKey, signerIdentity } from "@metaplex-foundation/umi";
import {
  burnV1,
  fetchDigitalAsset,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import bs58 from "bs58";
import { useRedeemRewardType } from "@/service/rewards/useRedeemReward";

export type useRevealCodeResponse = {
  instructions: Array<{
    programId: string;
    keys: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    data: string;
  }>;
};

function useRevealCode(address: string) {
  const wallet = useWallet();
  const connection = useConnection();
  return useMutation({
    mutationFn: async () => {
      const { publicKey: walletAdress } = wallet;
      if (!walletAdress) {
        throw new Error("Invalid params");
      }
      const assetId = publicKey(address);
      const asset = await fetchDigitalAsset(umi, assetId);

      const mint = asset.mint;
      const owner = asset.publicKey;

      const { data } = await axios.post<any>("/rewards/reveal", {
        walletAddress: publicKey?.toString(),
        nftAddress: address,
      });

      const tx = VersionedTransaction.deserialize(
        Buffer.from(data?.serializedTx, "base64"),
      );

      await wallet?.signTransaction?.(tx);

      console.log(tx);
      // umi.use(walletAdapterIdentity(wallet));
      // const txb = await burnV1(umi, {
      //   mint: mint,
      //   tokenStandard: TokenStandard.NonFungible,
      // });
      // const txSig = await txb.sendAndConfirm(umi);
      // const explorerUrl = `https://explorer.solana.com/tx/${bs58.encode(txSig.signature)}?cluster=devnet`;
      // window.open(explorerUrl, "_blank");
    },
  });
}

export default useRevealCode;
