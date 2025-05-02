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
  sol,
} from "@metaplex-foundation/umi";
import { mockStorage } from "@metaplex-foundation/umi-storage-mock";

import { getExplorerLink } from "@solana-developers/helpers";
import { promises as fs } from "fs";
import * as path from "path";
import { encryptVoucherData } from "./utils";

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

const generateCollection = async (brand: string) => {
  const collectionImagePath = `./uploads/${brand}/collection.jpg`;
  const collectionData = require(`./uploads/${brand}/collection.json`);

  const buffer = await fs.readFile(collectionImagePath);
  let file = createGenericFile(buffer, collectionImagePath, {
    contentType: "image/png",
  });
  const [image] = await umi.uploader.upload([file]);
  console.log("image uri:", image);

  const uri = await umi.uploader.uploadJson({
    ...collectionData,
    image,
  });

  console.log("Collection offchain metadata URI:", uri);

  // // generate mint keypair
  // const collectionMint = generateSigner(umi);
  //
  // // create and mint NFT
  // await createNft(umi, {
  //   mint: collectionMint,
  //   name: collectionData.name,
  //   uri,
  //   updateAuthority: umi.identity.publicKey,
  //   sellerFeeBasisPoints: percentAmount(0),
  //   isCollection: true,
  // }).sendAndConfirm(umi, { send: { commitment: "finalized" } });
  //
  // let explorerLink = getExplorerLink(
  //   "address",
  //   collectionMint.publicKey,
  //   "devnet",
  // );
  // console.log(`Collection NFT:  ${explorerLink}`);
  // console.log(`Collection NFT address is:`, collectionMint.publicKey);
  // console.log("✅ Finished successfully!");
  return uri;
};

generateCollection("vietjet");
