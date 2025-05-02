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
  percentAmount,
} from "@metaplex-foundation/umi";
import { mockStorage } from "@metaplex-foundation/umi-storage-mock";
import { promises as fs } from "fs";
import { getExplorerLink } from "@solana-developers/helpers";

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
  const jsonUri = `https://raw.githubusercontent.com/megatunger/omni-points/refs/heads/main/mint-nft/uploads/${brand}/collection.json`;
  const collectionData = require(`./uploads/${brand}/collection.json`);
  // generate mint keypair
  const collectionMint = generateSigner(umi);

  // create and mint NFT
  await createNft(umi, {
    mint: collectionMint,
    name: collectionData.name,
    uri: jsonUri,
    updateAuthority: umi.identity.publicKey,
    sellerFeeBasisPoints: percentAmount(0),
    isCollection: true,
  }).sendAndConfirm(umi, { send: { commitment: "finalized" } });

  let explorerLink = getExplorerLink(
    "address",
    collectionMint.publicKey,
    "devnet",
  );
  console.log(`Collection NFT:  ${explorerLink}`);
  console.log(`Collection NFT address is:`, collectionMint.publicKey);
  console.log("✅ Finished successfully!");
};

generateCollection("vietjet");
