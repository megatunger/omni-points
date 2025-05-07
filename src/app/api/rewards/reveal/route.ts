import { NextResponse } from "next/server";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey,
} from "@metaplex-foundation/umi";
import { AppKeypair, umi } from "@/utils/constants";
import {
  createNft,
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@solana/web3.js";
import { VietjetCollection } from "../../../../../mint-nft/constants";
import axios from "axios";
import { base64 } from "@metaplex-foundation/umi-serializers-encodings";

export async function POST(req: Request) {
  try {
    const { walletAddress, nftAddress } = await req.json();

    if (!walletAddress || !nftAddress) {
      return NextResponse.json(
        { error: "Both walletAddress and nftAddress are required" },
        { status: 400 },
      );
    }

    const assetId = publicKey(nftAddress);
    const asset = await fetchDigitalAsset(umi, assetId);
    const data = asset.metadata;

    const { data: offChain } = await axios.get(data.uri);

    const creator = createSignerFromKeypair(umi, AppKeypair);
    umi.use(keypairIdentity(creator));
    umi.use(mplTokenMetadata());
    const mint = generateSigner(umi);
    const txb = await createNft(umi, {
      mint,
      name: "RECEIPT_" + data.name,
      uri: data.uri,
      sellerFeeBasisPoints: percentAmount(0),
      creators: [{ address: creator.publicKey, verified: true, share: 100 }],
      isCollection: true,
      // @ts-ignore
      collection: { key: new PublicKey(VietjetCollection), verified: false },
    });
    // await txb.useV0().setLatestBlockhash(umi);
    const tx = (await txb.setLatestBlockhash(umi)).build(umi);

    const rawTx = umi.transactions.serialize(tx);

    const serializedTx = Buffer.from(rawTx).toString("base64");

    return NextResponse.json({
      serializedTx,
    });
  } catch (error) {
    console.error("Error revealing reward:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request" },
      { status: 500 },
    );
  }
}
