import { Metaplex } from "@metaplex-foundation/js";
import { connection } from "@/utils/constants";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchAllDigitalAssetWithTokenByOwner,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const umi = createUmi(clusterApiUrl("devnet")).use(mplTokenMetadata());

  // The owner's public key
  const ownerPublicKey = publicKey(
    "JB2PffXm8f7Dq5g4xGBcnYyfjLCyPu5JDkm7xuWiMgwF",
  );

  console.log("Fetching NFTs...");
  const allNFTs = await fetchAllDigitalAssetWithTokenByOwner(
    umi,
    ownerPublicKey,
  );

  console.log("allNFTs", allNFTs);

  const data = await Promise.all(
    allNFTs.map(async (nft) => {
      const response = await fetch(nft.metadata.uri);
      let _metadata;
      try {
        _metadata = await response.json();
      } catch (error) {
        console.error("Error parsing JSON:", error);
        _metadata = null;
      }
      return {
        address: nft.publicKey,
        name: nft.metadata.name,
        metadata: _metadata,
      };
    }),
  );
  return NextResponse.json(data.filter((x) => x));
  // return new Response("Hello, from API!");re
}
