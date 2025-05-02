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
import * as fs from "fs";
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

const nft = "vietjet/1";

const nftDetail = require(`./uploads/${nft}/attributes.json`);

async function uploadImage(): Promise<string> {
  try {
    const imgDirectory = `./uploads/${nft}`;
    const imgName = "image.png";
    const filePath = `${imgDirectory}/${imgName}`;
    const fileBuffer = fs.readFileSync(filePath);
    const image = createGenericFile(fileBuffer, imgName, {
      uniqueName: nftDetail.name,
      contentType: nftDetail.imgType,
    });
    const [imgUri] = await umi.uploader.upload([image]);
    console.log("Uploaded image:", imgUri);
    return imgUri;
  } catch (e) {
    throw e;
  }
}

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
    console.log("Metadata:", metadata);
    const metadataUri = await umi.uploader.uploadJson(metadata);
    console.log("Uploaded metadata:", metadataUri);
    return metadataUri;
  } catch (e) {
    throw e;
  }
}

async function mintNft(metadataUri: string, collectionMint: KeypairSigner) {
  try {
    const mint = generateSigner(umi);
    await createNft(umi, {
      mint,
      name: nftDetail.name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(nftDetail.royalties),
      creators: [{ address: creator.publicKey, verified: true, share: 0 }],
      collection: { key: collectionMint.publicKey, verified: false },
    }).sendAndConfirm(umi);
    console.log(`Created NFT: ${mint.publicKey.toString()}`);
  } catch (e) {
    throw e;
  }
}

const createCollection = async () => {
  const collectionMint = generateSigner(umi);

  await createNft(umi, {
    mint: collectionMint,
    name: `My Collection`,
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi);
};

async function main() {
  const imageUri = await uploadImage();
  console.log("Uploaded image:", imageUri);
  const metadataUri = await uploadMetadata(imageUri);
  // await mintNft(metadataUri);
}

main();
