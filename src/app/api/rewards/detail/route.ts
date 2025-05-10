import { AppKeypair, umi } from "@/utils/constants";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchAllDigitalAssetWithTokenByOwner,
  fetchDigitalAsset,
  fetchDigitalAssetWithTokenByMint,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { NextResponse } from "next/server";
import * as process from "node:process";

export async function GET(request: Request) {
  // If params include `?address=...`, use that address
  // Otherwise, use the default address
  const url = new URL(request.url);
  const params = url.searchParams;
  const address = params.get("address");

  console.log("Fetching NFTs...");
  let nft = await fetchDigitalAssetWithTokenByMint(umi, publicKey(address!));
  const response = await fetch(nft.metadata.uri);
  let _metadata;
  let _result = {};
  // console.log(nft.metadata);
  try {
    _metadata = await response.json();
  } catch (error) {
    // console.error("Error parsing JSON:", error);
    _metadata = null;
  }
  _result = {
    address: nft.publicKey,
    name: nft.metadata.name,
    metadata: _metadata,
  };

  return NextResponse.json(_result);
  // return new Response("Hello, from API!");re
}
