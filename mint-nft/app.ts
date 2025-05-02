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

const nft = "vietjet/1";

const nftDetail = require(`./uploads/${nft}/attributes.json`);

async function uploadMetadata(imageUri: string): Promise<string> {
  try {
    const metadata = {
      name: nftDetail.name,
      description: nftDetail.description,
      image: imageUri,
      attributes: encryptVoucherData(nftDetail.attributes),
      properties: {
        files: [
          {
            type: nftDetail.imgType,
            uri: imageUri,
          },
        ],
      },
    };
    console.log("Metadata:", JSON.stringify(metadata));
    // const metadataUri = await umi.uploader.uploadJson(metadata);
    // console.log("Uploaded metadata:", metadataUri);
    return "";
  } catch (e) {
    throw e;
  }
}

async function mintNft(metadataUri: string) {
  try {
    const mint = generateSigner(umi);
    await createNft(umi, {
      mint,
      name: nftDetail.name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(nftDetail.royalties),
      creators: [{ address: creator.publicKey, verified: true, share: 0 }],
      // @ts-ignore
      collection: { key: new PublicKey(VietjetCollection), verified: false },
    }).sendAndConfirm(umi);
    console.log(`Created NFT: ${mint.publicKey.toString()}`);
  } catch (e) {
    throw e;
  }
}

async function main() {
  const imageUri = `https://raw.githubusercontent.com/megatunger/omni-points/refs/heads/main/mint-nft/uploads/${nft}/image.png`;
  const metadataUri = `https://raw.githubusercontent.com/megatunger/omni-points/refs/heads/main/mint-nft/uploads/${nft}/attributes.json`;
  // const metadataUri = await uploadMetadata(imageUri);
  await mintNft(metadataUri);
}

main();
