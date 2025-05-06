import { NextResponse } from "next/server";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { AppKeypair, OptToken, rpc, umi } from "@/utils/constants";
import { PublicKey } from "@metaplex-foundation/js";
import { Transaction } from "@solana/web3.js";
import axios from "axios";

export async function POST(req: Request) {
  const { walletAddress, nftAddress } = await req.json();

  if (!walletAddress || !nftAddress) {
    return NextResponse.json(
      { error: "Both walletAddress and nftAddress are required" },
      { status: 400 },
    );
  }

  const recipient = new PublicKey(walletAddress);
  const mintPubkey = new PublicKey(nftAddress);

  // 1. Fetch on-chain metadata via Umi
  const asset = await fetchDigitalAsset(umi, mintPubkey);
  const data = asset.metadata;

  // 2. Fetch off-chain JSON to get the price
  const { data: offChain } = await axios.get(data.uri);
  const priceAttr = Object.values(offChain.attributes).find(
    (attr: any) => attr.trait_type === "price",
  );
  if (!priceAttr) {
    return NextResponse.json(
      { error: "Price attribute not found in metadata JSON" },
      { status: 500 },
    );
  }
  const priceAmount = Number(priceAttr.value);

  // derive ATAs
  const serverPubkey = AppKeypair.publicKey;
  const senderNftAta = await getAssociatedTokenAddress(
    mintPubkey,
    serverPubkey,
  );
  const recipientNftAta = await getAssociatedTokenAddress(
    mintPubkey,
    recipient,
  );
  const clientOptAta = await getAssociatedTokenAddress(OptToken, recipient);
  const serverOptAta = await getAssociatedTokenAddress(OptToken, serverPubkey);

  console.log("priceAmount", priceAmount);
  // 1. client must pay price in OPT into your server’s ATA
  const ixClientCreateOptAta = createAssociatedTokenAccountInstruction(
    recipient, // payer
    clientOptAta, // associated account
    recipient, // owner of new ATA
    OptToken,
  );
  const ixClientPayOpt = createTransferInstruction(
    clientOptAta,
    serverOptAta,
    recipient,
    priceAmount,
    [],
    TOKEN_2022_PROGRAM_ID,
  );

  // 2. once server sees that transfer, it returns the NFT
  const ixServerCreateNftAta = createAssociatedTokenAccountInstruction(
    serverPubkey,
    recipientNftAta,
    recipient,
    mintPubkey,
  );
  const ixServerReturnNft = createTransferInstruction(
    senderNftAta,
    recipientNftAta,
    serverPubkey,
    1,
    [],
    TOKEN_PROGRAM_ID,
  );

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const transaction = new Transaction().add(
    // ixClientCreateOptAta,
    ixClientPayOpt,
    // ixServerCreateNftAta,
    // ixServerReturnNft,
  );
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = AppKeypair.publicKey;
  transaction.sign(AppKeypair);

  const instructions = transaction
    .serialize({
      requireAllSignatures: false,
    })
    .toString("base64");

  // 5. Return serialized instructions + core metadata fields
  return NextResponse.json({
    instructions,
    metadata: {
      name: data.name,
      symbol: data.symbol,
      uri: data.uri,
      sellerFeeBps: data.sellerFeeBasisPoints,
      creators: data.creators,
    },
  });
}
