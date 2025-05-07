// src/app/api/voucher/confirm/route.ts
import { NextResponse } from 'next/server';
import {Connection, PublicKey} from '@solana/web3.js';
import bs58 from 'bs58';

// Import Metaplex/UMI libraries
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createSignerFromKeypair,
  signerIdentity,
  generateSigner,
  percentAmount,
  KeypairSigner,
  PublicKey as UmiPublicKey,
  createGenericFile
} from "@metaplex-foundation/umi";
import {
  createNft,
  mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";

/**
 * API to confirm successful token transfer, create metadata and mint NFT to user
 *
 * @route POST /api/voucher/confirm
 * @param {string} signature - Transaction signature
 * @param {string} userPublicKey - User's wallet public key
 * @param {string} voucherName - Name of the voucher
 * @param {string} voucherImageUrl - Image URL for the voucher
 * @param {string} voucherDescription - Description of the voucher
 * @param {object} attributes - Optional attributes for the voucher metadata
 * @param {string} uri - Optional pre-generated metadata URI (if provided, skip metadata creation)
 */
export async function POST(req: Request) {
  try {
    const {
      signature,
      userPublicKey,
      voucherName,
      voucherImageUrl,
      voucherDescription,
      attributes = [],
      uri = ""  // Optional pre-generated metadata URI
    } = await req.json();

    // Validate required parameters
    if (!signature || !userPublicKey) {
      return NextResponse.json({
        error: "Missing required parameters. Need signature and userPublicKey.",
        status: 400
      });
    }

    // Get environment variables
    const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const TREASURY_PRIVATE_KEY = process.env.APP_TREASURY_PRIVATE_KEY;

    if (!TREASURY_PRIVATE_KEY) {
      console.error("Missing APP_TREASURY_PRIVATE_KEY environment variable");
      return NextResponse.json({
        error: "Server configuration error",
        status: 500
      });
    }

    const connection = new Connection(RPC_URL);

    // Confirm token transfer transaction was successful
    try {
      const txStatus = await connection.getSignatureStatus(signature);

      if (!txStatus.value) {
        return NextResponse.json({
          error: "Transaction not found",
          status: "not_found"
        }, { status: 404 });
      }

      if (txStatus.value.err) {
        return NextResponse.json({
          error: "Transaction failed",
          details: txStatus.value.err,
          status: "failed"
        }, { status: 400 });
      }

      // If transaction was successful, create metadata and mint NFT to user

      // Initialize UMI
      const umi = createUmi(RPC_URL);

      // Create keypair from treasury private key
      const treasurySecretKey = bs58.decode(TREASURY_PRIVATE_KEY);
      const treasuryKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(treasurySecretKey));
      const treasurySigner = createSignerFromKeypair(umi, treasuryKeypair);

      // Set treasury as the identity and configure uploader
      umi.use(signerIdentity(treasurySigner));
      umi.use(mplTokenMetadata());
      umi.use(irysUploader());

      // Generate a new mint signer for the NFT
      const mint = generateSigner(umi);

      // Set default values if not provided
      const name = voucherName || "Voucher NFT";
      const symbol = "VCHR";

      // Convert user public key to UMI format
      const userPubkey = new PublicKey(userPublicKey);

      try {
        let metadataUri = uri;

        // Only create and upload metadata if a URI wasn't provided
        if (!uri) {
          const image = voucherImageUrl || "https://example.com/default-image.png";
          const description = voucherDescription || `Voucher for ${name}`;

          // Create metadata object
          const metadata = {
            name,
            symbol,
            description,
            image,
            attributes: [
              ...attributes
            ],
            properties: {
              files: [
                { type: "image/png", uri: image }
              ]
            },
            creators: [
              { address: treasurySigner.publicKey, share: 100 }
            ]
          };

          // Convert metadata to generic file
          const file = createGenericFile(
              JSON.stringify(metadata),
              'metadata.json',
              { contentType: 'application/json' }
          );

          console.log("Uploading metadata to Irys...");

          // Upload metadata
          const [uploadedUri] = await umi.uploader.upload([file]);
          metadataUri = uploadedUri;

          console.log("Metadata URI created:", metadataUri);
        }

        // Create NFT transaction
        const nftTx = createNft(umi, {
          mint,
          name,
          symbol,
          uri: metadataUri,
          sellerFeeBasisPoints: percentAmount(0), // 0% royalties
          creators: [
            {
              address: treasurySigner.publicKey,
              share: 100,
              verified: true,
            }
          ],
          collection: null,
          uses: null,
          tokenOwner: userPubkey, // Mint directly to user
          tokenStandard: null,
        });

        console.log("Sending NFT minting transaction...");

        // Send and confirm the transaction
        const result = await nftTx.sendAndConfirm(umi);
        const nftSignature = bs58.encode(result.signature);

        console.log("NFT minted successfully with signature:", nftSignature);

        // Return success response with NFT info
        return NextResponse.json({
          success: true,
          transactionSignature: signature,
          nftSignature: nftSignature,
          nftMint: mint.publicKey,
          metadataUri: metadataUri,
          message: "Token transfer confirmed and NFT minted successfully",
          status: "confirmed",
          explorerUrl: `https://explorer.solana.com/tx/${nftSignature}?cluster=${process.env.SOLANA_NETWORK || 'devnet'}`
        });
      } catch (nftError) {
        console.error("Error creating metadata or minting NFT:", nftError);
        return NextResponse.json({
          success: false,
          transactionSignature: signature,
          error: "Token transfer confirmed but NFT creation failed",
          details: nftError.message,
          status: "partial_success"
        }, { status: 500 });
      }
    } catch (error) {
      console.error("Error confirming transaction:", error);
      return NextResponse.json({
        error: "Failed to confirm transaction",
        details: error.message,
        status: "error"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in confirm API:", error);
    return NextResponse.json({
      error: "Failed to process confirmation request",
      details: error.message,
      status: "error"
    }, { status: 500 });
  }
}
