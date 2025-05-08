import {
  createNft,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createGenericFile,
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  KeypairSigner,
  percentAmount,
} from "@metaplex-foundation/umi";
import { mockStorage } from "@metaplex-foundation/umi-storage-mock";
import * as fs from "fs";
import { encryptVoucherData } from "./utils";
import { PublicKey } from "@solana/web3.js";
import { VietjetCollection } from "./constants";

const secret = require("../secrets/wallet.json");

const DEV_RPC = "https://api.devnet.solana.com";
const umi = createUmi(DEV_RPC);

const creatorWallet = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(secret),
);

const creator = createSignerFromKeypair(umi, creatorWallet);
umi.use(keypairIdentity(creator));
umi.use(mplTokenMetadata());
umi.use(mockStorage());

async function mintNft(nft: string) {
  const metadataUri = `https://raw.githubusercontent.com/megatunger/omni-points/refs/heads/main/mint-nft/uploads/${nft}/attributes.json`;
  const nftDetail = require(`./uploads/${nft}/attributes.json`);

  // util to get the hours and minutes current
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  try {
    const mint = generateSigner(umi);
    await createNft(umi, {
      mint,
      name: nftDetail.name + `${hours}${minutes}`,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      creators: [{ address: creator.publicKey, verified: true, share: 100 }],
      isCollection: true,
      // @ts-ignore
      collection: { key: new PublicKey(VietjetCollection), verified: false },
    }).sendAndConfirm(umi);
    console.log(`Created NFT: ${mint.publicKey.toString()}`);
  } catch (e) {
    throw e;
  }
}

async function main() {
  await mintNft("vietjet/1");
}

main();
