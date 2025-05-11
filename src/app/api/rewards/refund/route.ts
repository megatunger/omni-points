import { NextResponse } from "next/server";
import { publicKey } from "@metaplex-foundation/umi";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { AppKeypair, OptToken, rpc, umi } from "@/utils/constants";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios from "axios";
import _, { sample } from "lodash";
import { PublicKey, Transaction } from "@solana/web3.js";

const REFUND_PERCENTAGE = 0.8; // 80% refund

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

    const price = _.find(offChain.attributes, {
      trait_type: "price",
    }).value;
    // A logic to determine if the flight was canceled can be added here.
    if (false) {
      return NextResponse.json(
        { error: "Your flight was not canceled. You can not get refund" },
        { status: 200 },
      );
    }

    const priceAmount = Number(price * REFUND_PERCENTAGE) * 10 ** 9; // convert to lamports

    const serverPubkey = AppKeypair.publicKey;

    const clientOptAta = await getAssociatedTokenAddress(
      OptToken,
      new PublicKey(walletAddress),
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const serverOptAta = await getAssociatedTokenAddress(
      OptToken,
      serverPubkey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    const ixServerReturnOpt = createTransferInstruction(
      serverOptAta,
      clientOptAta,
      serverPubkey,
      priceAmount,
      [],
      TOKEN_2022_PROGRAM_ID,
    );
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const transaction = new Transaction().add(ixServerReturnOpt);
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = AppKeypair.publicKey;
    transaction.sign(AppKeypair);
    // await umi.rpc.sendTransaction(transaction);

    const instructions = transaction.serialize().toString("base64");

    return NextResponse.json({
      instructions,
    });
  } catch (error) {
    console.error("Error revealing reward:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the request" },
      { status: 500 },
    );
  }
}
