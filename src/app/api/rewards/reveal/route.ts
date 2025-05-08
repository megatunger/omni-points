import { NextResponse } from "next/server";
import { publicKey } from "@metaplex-foundation/umi";
import { umi } from "@/utils/constants";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import _ from "lodash";
import secret from "../../../../../secrets/wallet.json";
import SimpleCrypto from "simple-crypto-js";

export async function POST(req: Request) {
  try {
    const { walletAddress, nftAddress } = await req.json();

    if (!walletAddress || !nftAddress) {
      return NextResponse.json(
        { error: "Both walletAddress and nftAddress are required" },
        { status: 400 },
      );
    }

    const userWallet = publicKey(walletAddress);
    const assetId = publicKey(nftAddress);
    const asset = await fetchDigitalAsset(umi, assetId);
    const data = asset.metadata;

    const { data: offChain } = await axios.get(data.uri);

    if (data.updateAuthority !== userWallet.toString()) {
      return NextResponse.json(
        { error: "You are not the owner of this NFT" },
        { status: 403 },
      );
    }
    const secret_code = _.find(offChain.attributes, {
      trait_type: "secret_code",
    }).value;

    const simpleCrypto = new SimpleCrypto(secret);

    return NextResponse.json({
      secretCode: simpleCrypto.decrypt(secret_code),
    });
  } catch (error) {
    console.error("Error revealing reward:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request" },
      { status: 500 },
    );
  }
}
