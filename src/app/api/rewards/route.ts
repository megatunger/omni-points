import { Metaplex } from "@metaplex-foundation/js";
import { AppKeypair, connection } from "@/utils/constants";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchAllDigitalAssetWithTokenByOwner,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { NextResponse } from "next/server";
import * as process from "node:process";

export async function GET(request: Request) {
  const umi = createUmi(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  ).use(mplTokenMetadata());

  // If params include `?address=...`, use that address
  // Otherwise, use the default address
  const url = new URL(request.url);
  const params = url.searchParams;
  const address = params.get("address");
  const defaultAddress = AppKeypair.publicKey;

  // The owner's public key
  const ownerPublicKey = address || defaultAddress.toString();

  console.log("Fetching NFTs...");
  let allNFTs = await fetchAllDigitalAssetWithTokenByOwner(
    umi,
    publicKey(ownerPublicKey),
  );

  // Filter NFTs created by omni points
  allNFTs = allNFTs.filter((e) => {
    return (
      e.metadata.updateAuthority.toString() ===
        AppKeypair.publicKey.toString() || e.metadata.name.includes("RECEIPT")
    );
  });

  const data = await Promise.all(
    allNFTs.map(async (nft) => {
      const response = await fetch(nft.metadata.uri);
      let _metadata;
      // console.log(nft.metadata);
      try {
        _metadata = await response.json();
      } catch (error) {
        // console.error("Error parsing JSON:", error);
        _metadata = null;
      }
      return {
        address: nft.publicKey,
        name: nft.metadata.name,
        metadata: _metadata,
      };
    }),
  );
  return NextResponse.json(
    data.filter((x) => {
      return !!x.metadata && !!x?.metadata?.attributes;
    }),
  );
  // return new Response("Hello, from API!");re
}
