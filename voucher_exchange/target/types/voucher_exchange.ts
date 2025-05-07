/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/voucher_exchange.json`.
 */
export type VoucherExchange = {
  "address": "AQgLTmiMJLXoEtmyVStnNxE6i175WdCwaXdedGD6hgSw",
  "metadata": {
    "name": "voucherExchange",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptVoucherBid",
      "discriminator": [
        130,
        6,
        229,
        251,
        76,
        192,
        148,
        227
      ],
      "accounts": [
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "bidder",
          "writable": true
        },
        {
          "name": "nftMint",
          "writable": true
        },
        {
          "name": "nftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "ownerNftAccount",
          "writable": true
        },
        {
          "name": "bidderNftAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMint",
          "writable": true
        },
        {
          "name": "escrowAccount",
          "writable": true
        },
        {
          "name": "ownerPaymentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelVoucherBid",
      "discriminator": [
        132,
        72,
        181,
        245,
        215,
        133,
        161,
        60
      ],
      "accounts": [
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftMint"
        },
        {
          "name": "escrowAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "bidderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelVoucherListing",
      "discriminator": [
        76,
        198,
        55,
        75,
        194,
        44,
        121,
        202
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createVoucherBid",
      "discriminator": [
        123,
        117,
        58,
        112,
        250,
        96,
        168,
        5
      ],
      "accounts": [
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "exchange",
          "writable": true
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftMint"
        },
        {
          "name": "nftState",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                139,
                202,
                4,
                141,
                186,
                78,
                107,
                74,
                72,
                192,
                120,
                119,
                233,
                79,
                86,
                239,
                235,
                47,
                173,
                222,
                59,
                108,
                2,
                126,
                31,
                195,
                61,
                213,
                242,
                91,
                198,
                44
              ]
            }
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "bidderTokenAccount",
          "writable": true
        },
        {
          "name": "escrowAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "escrowBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createVoucherListing",
      "discriminator": [
        78,
        32,
        90,
        103,
        180,
        177,
        116,
        203
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "exchange",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftMint"
        },
        {
          "name": "nftAccount",
          "writable": true
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fulfillVoucherListing",
      "discriminator": [
        38,
        104,
        137,
        112,
        76,
        251,
        254,
        129
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true
        },
        {
          "name": "nftMint",
          "writable": true
        },
        {
          "name": "nftState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "nftAccount",
          "writable": true
        },
        {
          "name": "buyerNftAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMint",
          "writable": true
        },
        {
          "name": "buyerPaymentAccount",
          "writable": true
        },
        {
          "name": "ownerPaymentAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeExchange",
      "discriminator": [
        224,
        105,
        116,
        166,
        228,
        207,
        96,
        19
      ],
      "accounts": [
        {
          "name": "exchange",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  101,
                  120,
                  99,
                  104,
                  97,
                  110,
                  103,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "markBidForRefund",
      "discriminator": [
        153,
        150,
        13,
        191,
        147,
        178,
        194,
        42
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "exchange",
          "writable": true
        },
        {
          "name": "nftState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "nftMint"
        },
        {
          "name": "bidder"
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refundBid",
      "discriminator": [
        171,
        145,
        79,
        190,
        16,
        50,
        10,
        24
      ],
      "accounts": [
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  117,
                  99,
                  104,
                  101,
                  114,
                  95,
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "nftMint"
        },
        {
          "name": "escrowAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "account",
                "path": "nftMint"
              }
            ]
          }
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "bidderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "voucherBid",
      "discriminator": [
        131,
        27,
        216,
        77,
        135,
        190,
        24,
        171
      ]
    },
    {
      "name": "voucherExchange",
      "discriminator": [
        107,
        212,
        177,
        119,
        6,
        78,
        63,
        131
      ]
    },
    {
      "name": "voucherListing",
      "discriminator": [
        63,
        158,
        166,
        242,
        59,
        29,
        25,
        138
      ]
    },
    {
      "name": "voucherState",
      "discriminator": [
        232,
        95,
        171,
        70,
        70,
        253,
        73,
        236
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "feeTooHigh",
      "msg": "Exchange fee is too high"
    },
    {
      "code": 6001,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6002,
      "name": "notNftOwner",
      "msg": "Not the NFT owner"
    },
    {
      "code": 6003,
      "name": "notListingOwner",
      "msg": "Not the listing owner"
    },
    {
      "code": 6004,
      "name": "notBidder",
      "msg": "Not the bidder"
    },
    {
      "code": 6005,
      "name": "notExchangeAuthority",
      "msg": "Not the exchange authority"
    },
    {
      "code": 6006,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for transaction"
    },
    {
      "code": 6007,
      "name": "listingNotActive",
      "msg": "Listing is not active"
    },
    {
      "code": 6008,
      "name": "bidNotActive",
      "msg": "Bid is not active"
    },
    {
      "code": 6009,
      "name": "insufficientNftAmount",
      "msg": "Insufficient NFT amount (must be 1)"
    },
    {
      "code": 6010,
      "name": "nftAlreadySold",
      "msg": "NFT has already been sold"
    },
    {
      "code": 6011,
      "name": "bidNotRequiresRefund",
      "msg": "Bid does not require refund"
    },
    {
      "code": 6012,
      "name": "invalidBidState",
      "msg": "Invalid bid state for this operation"
    }
  ],
  "types": [
    {
      "name": "voucherBid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "escrowAccount",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "requiresRefund",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "escrowBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voucherExchange",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "totalListings",
            "type": "u64"
          },
          {
            "name": "totalBids",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voucherListing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "nftAccount",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voucherState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "pubkey"
          },
          {
            "name": "sold",
            "type": "bool"
          },
          {
            "name": "latestSaleTimestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
