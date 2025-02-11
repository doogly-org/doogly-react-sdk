import React, { useEffect, useState } from "react";
import { Eip1193Provider, ethers, JsonRpcSigner } from "ethers";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/ui/button";
import "../index.css";
import {
  ChainType,
  Token,
  ChainData,
  OnChainExecutionData,
} from "@0xsquid/squid-types";
import HttpAdapter from "../adapter/HttpAdapter";
import { PhantomSigner, SolanaSigner } from "../types";
import { SolanaHandler } from "../handlers/solana";
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
// import * as bitcoin from "bitcoinjs-lib";
// import * as ecc from "tiny-secp256k1";

declare global {
  interface Window {
    ethereum: Eip1193Provider;
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: { toString(): string } }>;
    };
    phantom?: {
      bitcoin: {
        connect(): Promise<{ publicKey: { toString(): string } }>;
      };
    };
  }
}

const erc20ContractABI = [
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
      {
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

interface Web3Config {
  provider?: ethers.JsonRpcProvider | ethers.BrowserProvider;
}

interface DooglyDonateProps {
  buttonText?: string;
  buttonClassName?: string;
  modalTitle?: string;
  web3Config?: Web3Config;
  config?: {
    destinationChain?: string;
    destinationAddress?: string;
    destinationOutputTokenAddress?: string;
  };
  projectId?: string;
  provider?: ethers.BrowserProvider | ethers.Provider;
  signer?: ethers.JsonRpcSigner;
  modalStyles?: {
    backgroundColor?: string;
    headingColor?: string;
    textColor?: string;
    buttonColor?: string;
  };
  postSwapHook?: Array<{
    target: `0x${string}`;
    callData: `0x${string}`;
    callType?: number;
    tokenAddress?: `0x${string}`;
    inputPos?: number;
  }>;
  apiUrl: string;
}

// type BtcAccount = {
//   address: string;
//   addressType: "p2tr" | "p2wpkh" | "p2sh" | "p2pkh";
//   publicKey: string;
//   purpose: "payment" | "ordinals";
// };

export const DooglyDonateButton: React.FC<DooglyDonateProps> = ({
  buttonText = "Donate with Crypto",
  buttonClassName = "",
  modalTitle = "Make a Donation",
  config: initialConfig = {},
  modalStyles = {},
  apiUrl,
  postSwapHook,
}) => {
  return (
    <DooglyDonateModal
      buttonText={buttonText}
      buttonClassName={buttonClassName}
      modalTitle={modalTitle}
      config={initialConfig}
      modalStyles={modalStyles}
      apiUrl={apiUrl}
      postSwapHook={postSwapHook}
    />
  );
};

const DooglyDonateModal: React.FC<Omit<DooglyDonateProps, "web3Config">> = ({
  buttonText,
  buttonClassName,
  modalTitle,
  config: initialConfig,
  modalStyles,
  postSwapHook,
  apiUrl,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrLink, setQrLink] = useState("");
  const [provider, setProvider] = useState<
    ethers.BrowserProvider | ethers.Provider | SolanaSigner | null
  >(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | string | null>(
    null
  );
  const [, setNetwork] = useState<ethers.Network>();
  const [initialized, setInitialized] = useState(false);
  const [config] = useState(initialConfig);
  const [currentToken, setCurrentToken] = useState<Token>();
  const [currentChainId, setCurrentChainId] = useState<bigint | string>();

  const [donationAmount, setDonationAmount] = useState("0");
  const [submitButtonText, setSubmitButtonText] = useState("Donate");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [allTokens, setAllTokens] = useState<Token[]>();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [chains, setChains] = useState<ChainData[]>([]);
  const [connected, setConnected] = useState(false);
  const [chainSearchQuery, setChainSearchQuery] = useState("");
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  // const [bitcoinAddress, setBitcoinAddress] = useState("");

  const QRLink = `https://app.doogly.org/donate/v2`;

  const httpInstance = new HttpAdapter({
    baseUrl: apiUrl,
  });

  useEffect(() => {
    const updateProviders = async () => {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const net = await web3Provider.getNetwork();
        setNetwork(net);
        setSigner(signer);
        setProvider(web3Provider);
        setConnected(true);
      } catch (e) {
        console.error(e);
      }
    };

    const initialize = async () => {
      const response = await httpInstance.get("info");

      if (response.status != 200) {
        throw new Error("Initialization failed");
      }

      const filteredChains = response.data.chains.filter(
        (i: ChainData) =>
          i.chainType != ChainType.COSMOS && i.chainType != ChainType.BTC
      );

      // Rearranging the filteredChains to move the last element to the second position
      const rearrangedChains = [
        filteredChains[0], // First element remains the same
        filteredChains[filteredChains.length - 1], // Last element moved to second position
        ...filteredChains.slice(1, filteredChains.length - 1), // All elements except the first and last
      ];

      setAllTokens(response.data.tokens);
      setChains(rearrangedChains);
    };

    if (!initialized) {
      initialize();
      updateProviders();
      setInitialized(true);
    }
  });

  useEffect(() => {
    const fetchTokensAndSwitchChain = async (chain: string) => {
      const fromToken = allTokens?.filter(
        (t) => t.chainId === chain.toString()
      );
      setTokens(fromToken ?? []);
      setCurrentToken(fromToken?.[0]);
      const currentChainData = getChainData(chains, chain ?? "1");

      switch (currentChainData.chainType) {
        case ChainType.EVM:
          await switchChainEVM(parseInt(chain));
          break;
        case ChainType.SOLANA:
          setConnected(false);
          break;
        case ChainType.BTC:
          setConnected(false);
          break;
      }
    };

    if (chains.length > 1) {
      fetchTokensAndSwitchChain(currentChainId.toString());
    }
  }, [currentChainId]);

  async function switchChainEVM(chainId: number) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const net = await web3Provider.getNetwork();
      setNetwork(net);
      setSigner(signer);
      setProvider(web3Provider);
      setConnected(true);
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          const chainData = getChainData(chains, chainId);
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: chainData.networkName,
                rpcUrls: [chainData.rpc],
                iconUrls: [chainData.chainIconURI],
                nativeCurrency: chainData.nativeCurrency,
                blockExplorerUrls: chainData.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add the network to MetaMask");
        }
      } else {
        throw new Error("Failed to switch network in MetaMask");
      }
    }
  }

  const getChainData = (
    chains: ChainData[],
    chainId: number | string
  ): ChainData | undefined => chains?.find((chain) => chain.chainId == chainId);

  const connectWallet = async () => {
    try {
      if (currentChainId === "solana-mainnet-beta") {
        // Connect to Solana wallet (Phantom)
        const { solana } = window as any;
        if (!solana?.isPhantom) {
          window.open("https://phantom.app/", "_blank");
          return;
        }

        const response = await solana.connect();
        const provider = response.publicKey.toString();
        setSigner(provider);
        setProvider(solana);
        setConnected(true);
        // } else if (currentChainId === "bitcoin") {
        //   // Connect to Bitcoin wallet (PhantomBTC)
        //   const { bitcoin } = window.phantom as any;
        //   if (!bitcoin) {
        //     window.open("https://phantom.app/", "_blank");
        //     return;
        //   }

        //   const response: BtcAccount[] = await bitcoin.requestAccounts();
        //   const provider = response[0].publicKey.toString();
        //   setSigner(provider);
        //   setBitcoinAddress(response[0].address);
        //   setProvider(bitcoin);
        //   setConnected(true);
      } else {
        // Default EVM wallet connection
        if (!window.ethereum) {
          alert("Please install MetaMask!");
          return;
        }

        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const signer = await web3Provider.getSigner();
        setSigner(signer);
        setProvider(web3Provider);
        setConnected(true);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // Function to get deposit address for Solana and BTC
  const getDepositAddress = async (transactionRequest: any) => {
    try {
      const result = await httpInstance.post("deposit", transactionRequest, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      return result.data;
    } catch (error: any) {
      if (error.response) {
        console.error("API error:", error.response.data);
      }
      console.error("Error getting deposit address:", error);
      throw error;
    }
  };

  // Function to get status
  const getStatus = async (params: any) => {
    try {
      const result = await httpInstance.get("status", {
        params: {
          transactionId: params.chainflipId,
          fromChainId: params.fromChainId,
          toChainId: params.toChainId,
          bridgeType: params.bridgeType,
        },
      });
      return result.data;
    } catch (error: any) {
      if (error.response) {
        console.error("API error:", error.response.data);
      }
      console.error("Error with parameters:", params);
      throw error;
    }
  };

  // Function to check solana transaction status
  const updateTransactionStatus = async (
    chainflipId: string,
    requestId: string,
    toChainId: string
  ) => {
    const getStatusParams = {
      chainflipId,
      fromChainId: "solana-mainnet-beta",
      toChainId,
      bridgeType: toChainId === "42161" ? "chainflip" : "chainflipmultihop",
      requestId,
    };

    let status;
    const completedStatuses = [
      "success",
      "partial_success",
      "needs_gas",
      "not_found",
    ];
    const maxRetries = 10;
    let retryCount = 0;

    do {
      try {
        status = await getStatus(getStatusParams);
        console.log(`Route status: ${status.squidTransactionStatus}`);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error("Max retries reached. Transaction not found.");
            break;
          }
          console.log("Transaction not found. Retrying...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        } else {
          throw error;
        }
      }

      if (!completedStatuses.includes(status.squidTransactionStatus)) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } while (!completedStatuses.includes(status.squidTransactionStatus));
  };

  // Function to get the optimal route for the swap using Squid API
  const getRoute = async (params: any) => {
    try {
      const result = await httpInstance.post(
        "route",

        params,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const requestId = result.headers["x-request-id"]; // Retrieve request ID from response headers
      return { data: result.data, requestId: requestId };
    } catch (error) {
      if (error.response) {
        console.error("API error:", error.response.data);
      }
      console.error("Error with parameters:", params);
      throw error;
    }
  };

  async function generateQRLink() {
    const params = {
      toChain: config.destinationChain,
      toToken: config.destinationOutputTokenAddress,
      toAddress: config.destinationAddress,
      enableBoost: String(true),
      approveSpending: String(true),
    };

    if (postSwapHook) {
      postSwapHook.map((i, idx) => {
        params[`postHook[${idx}].target`] = i.target;
        params[`postHook[${idx}].callData`] = i.callData;
        params[`postHook[${idx}].callType`] = i.callType.toString() ?? "0";
        params[`postHook[${idx}].tokenAddress`] = i.tokenAddress ?? "";
        params[`postHook[${idx}].inputPos`] = i.inputPos ?? "0";
      });
    }

    // Construct the query string
    const queryString = new URLSearchParams(params).toString();

    // Update the QRLink to include the query parameters
    const QRLinkWithParams = `${QRLink}?${queryString}`;
    console.log(QRLinkWithParams);
    setQrLink(QRLinkWithParams);
  }

  async function submitDonation() {
    const amount = donationAmount;
    if (!amount) return;

    const inputTokenAddress = currentToken.address;

    setSubmitButtonDisabled(true);
    setSubmitButtonText("Processing...");

    try {
      if (
        getChainData(chains, currentChainId.toString()).chainType ==
        ChainType.EVM
      ) {
        // For ERC20 token transactions
        const donationAmount = ethers.parseUnits(
          String(amount),
          currentToken.decimals
        );

        const erc20Contract = new ethers.Contract(
          inputTokenAddress,
          erc20ContractABI,
          signer as JsonRpcSigner
        );

        let params = {
          fromAddress: (signer as JsonRpcSigner).address as string,
          fromChain: currentChainId?.toString(),
          fromToken: currentToken?.address as string,
          fromAmount: donationAmount.toString(),
          toChain: config.destinationChain,
          toToken: config.destinationOutputTokenAddress,
          toAddress: config.destinationAddress,
          enableBoost: true,
          approveSpending: true,
        };

        if (postSwapHook) {
          params["postHook"] = {
            chainType: ChainType.EVM,
            calls: postSwapHook.map(
              (i: {
                target: `0x${string}`;
                callData: `0x${string}`;
                callType?: number;
                tokenAddress?: `0x${string}`;
                inputPos?: number;
              }) => {
                return {
                  chainType: "evm",
                  callType: i.callType ?? 0,
                  target: i.target,
                  value: "0",
                  callData: i.callData,
                  payload: {
                    tokenAddress: i.tokenAddress ?? "",
                    inputPos: i.inputPos ?? 0,
                  },
                  estimatedGas: "50000",
                };
              }
            ),
            provider: "Doogly", //This should be the name of your product or application that is triggering the hook
            description: "Cross-chain donation",
            logoURI: "",
          };
        }

        // Get the swap route using Squid API
        const routeResult = await getRoute(params);
        const route = routeResult.data.route;
        // const requestId = routeResult.requestId;

        const transactionRequest = route.transactionRequest;

        if (
          currentToken?.address != "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
        ) {
          // Check current allowance
          // @ts-ignore
          const currentAllowance = await erc20Contract.allowance(
            (signer as JsonRpcSigner)?.address,
            (transactionRequest as OnChainExecutionData).target
          );
          // If current allowance is less than donation amount, request approval
          if (Number(currentAllowance) < donationAmount) {
            const approveTx = await erc20Contract.approve(
              (transactionRequest as OnChainExecutionData).target,
              donationAmount,
              {
                gasLimit: 500000,
              }
            );
            await approveTx.wait();
          }
        }

        const tx = await (signer as JsonRpcSigner).sendTransaction({
          to: transactionRequest.target,
          data: transactionRequest.data,
          value: transactionRequest.value,
          gasLimit: transactionRequest.gasLimit,
        });

        alert(`Donation successful! Transaction hash: ${tx.hash}`);
        setSubmitButtonText("Donation Successful!");
      } else {
        if (
          getChainData(chains, currentChainId.toString()).chainType ==
          ChainType.SOLANA
        ) {
          const solana = new SolanaHandler();
          const donationAmount = ethers.parseUnits(
            String(amount),
            currentToken.decimals
          );

          if (currentToken.symbol != "SOL" && currentToken.symbol != "USDC") {
            const params = {
              fromAddress: signer,
              fromChain: "solana-mainnet-beta",
              fromToken: currentToken.address,
              fromAmount: donationAmount.toString(),
              toChain: "solana-mainnet-beta",
              toToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              toAddress: signer,
              quoteOnly: false,
            };

            const routeResult = await getRoute(params);
            const route = routeResult.data.route;
            // const requestId = routeResult.requestId;

            await solana.executeRoute({
              data: {
                route: routeResult.data.route,
                signer: provider as SolanaSigner,
              },
            });

            // Transfer SOL to EVM address
            const params2 = {
              fromAddress: signer,
              fromChain: "solana-mainnet-beta",
              fromToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              fromAmount:
                route.estimate.actions[route.estimate.actions.length - 1]
                  .toAmount,
              toChain: config.destinationChain,
              toToken: config.destinationOutputTokenAddress,
              toAddress: config.destinationAddress,
              quoteOnly: false,
            };

            const routeResult2 = await getRoute(params2);
            const route2 = routeResult2.data.route;
            const requestId2 = routeResult2.requestId;

            // Get deposit address using transaction request
            const depositAddressResult = await getDepositAddress(
              route2.transactionRequest
            );

            // create array of instructions
            const instructions = [
              SystemProgram.transfer({
                fromPubkey: new PublicKey(signer),
                toPubkey: new PublicKey(depositAddressResult.depositAddress),
                lamports: parseInt(depositAddressResult.amount),
              }),
            ];

            const resp = await httpInstance.get("/blockhash");
            const latestBlockHash = await resp.data;

            // create v0 compatible message
            const messageV0 = new TransactionMessage({
              payerKey: new PublicKey(signer),
              recentBlockhash: latestBlockHash.blockhash,
              instructions,
            }).compileToV0Message();

            // make a versioned transaction
            const transactionV0 = new VersionedTransaction(messageV0);

            // phantom wallet signer
            const { signature } = await (
              provider as PhantomSigner
            ).signAndSendTransaction(transactionV0);

            // Monitor using chainflipStatusTrackingId with determined bridge type
            await updateTransactionStatus(
              depositAddressResult.chainflipStatusTrackingId,
              requestId2,
              config.destinationChain
            );
            alert(`Donation successful! Transaction hash: ${signature}`);
            setSubmitButtonText("Donation Successful!");
            return;
          }

          // Transfer SOL to EVM address
          const params = {
            fromAddress: signer,
            fromChain: "solana-mainnet-beta",
            fromToken: currentToken.address,
            fromAmount: donationAmount.toString(),
            toChain: config.destinationChain,
            toToken: config.destinationOutputTokenAddress,
            toAddress: config.destinationAddress,
            quoteOnly: false,
          };

          const routeResult = await getRoute(params);
          const route = routeResult.data.route;
          const requestId = routeResult.requestId;

          // Get deposit address using transaction request
          const depositAddressResult = await getDepositAddress(
            route.transactionRequest
          );

          // create array of instructions
          const instructions = [
            SystemProgram.transfer({
              fromPubkey: new PublicKey(signer),
              toPubkey: new PublicKey(depositAddressResult.depositAddress),
              lamports: parseInt(depositAddressResult.amount),
            }),
          ];

          const resp = await httpInstance.get("/blockhash");
          const latestBlockHash = await resp.data;

          // create v0 compatible message
          const messageV0 = new TransactionMessage({
            payerKey: new PublicKey(signer),
            recentBlockhash: latestBlockHash.blockhash,
            instructions,
          }).compileToV0Message();

          // make a versioned transaction
          const transactionV0 = new VersionedTransaction(messageV0);

          // phantom wallet signer
          const { signature } = await (
            provider as PhantomSigner
          ).signAndSendTransaction(transactionV0);

          alert(`Donation successful! Transaction hash: ${signature}`);
          setSubmitButtonText("Donation Successful!");

          // Monitor using chainflipStatusTrackingId with determined bridge type
          await updateTransactionStatus(
            depositAddressResult.chainflipStatusTrackingId,
            requestId,
            config.destinationChain
          );
        } else {
          // if (
          //   getChainData(chains, currentChainId.toString()).chainType ==
          //   ChainType.BTC
          // ) {
          //   const donationAmount = ethers.parseUnits(
          //     String(amount),
          //     currentToken.decimals
          //   );

          //   // Initialize the ECC library
          //   bitcoin.initEccLib(ecc);

          //   const BITCOIN_NETWORK = bitcoin.networks.bitcoin;

          //   // Set up parameters for swapping tokens
          //   const params = {
          //     fromAddress: bitcoinAddress,
          //     fromChain: "bitcoin",
          //     fromToken: "satoshi",
          //     fromAmount: donationAmount.toString(),
          //     toChain: config.destinationChain,
          //     toToken: config.destinationOutputTokenAddress,
          //     toAddress: config.destinationAddress,
          //     quoteOnly: false,
          //     enableBoost: true,
          //   };

          //   // Get the swap route using Squid API
          //   const routeResult = await getRoute(params);
          //   const route = routeResult.data.route;
          //   // const requestId = routeResult.requestId;

          //   // Get deposit address using transaction request
          //   const depositAddressResult = await getDepositAddress(
          //     route.transactionRequest
          //   );
          //   console.log("Deposit address result:", depositAddressResult);

          //   const utxoResponse = await httpInstance.get(
          //     `https://blockstream.info/api/address/${bitcoinAddress}/utxo`
          //   );
          //   const utxos = utxoResponse.data;

          //   // Create transaction
          //   const psbt = new bitcoin.Psbt({ network: BITCOIN_NETWORK });

          //   // Add inputs
          //   let totalInput = BigInt(0);
          //   for (const utxo of utxos) {
          //     // const txResponse = await httpInstance.get(
          //     //   `https://blockstream.info/api/tx/${utxo.txid}/hex`
          //     // );
          //     // const txHex = txResponse.data;

          //     psbt.addInput({
          //       hash: utxo.txid,
          //       index: utxo.vout,
          //       witnessUtxo: {
          //         script: bitcoin.payments.p2wpkh({
          //           pubkey: Buffer.from(signer as string),
          //           network: BITCOIN_NETWORK,
          //         }).output!,
          //         value: utxo.value,
          //       },
          //     });
          //     totalInput = totalInput + BigInt(utxo.value);
          //   }

          //   // Add output for the destination
          //   psbt.addOutput({
          //     address: depositAddressResult.depositAddress,
          //     value: depositAddressResult.amount,
          //   });

          //   // Add change output if necessary (assuming 800 sats fee)
          //   const fee = BigInt(800);
          //   const changeAmount = totalInput - depositAddressResult.amount - fee;
          //   if (changeAmount > BigInt(546)) {
          //     // Dust threshold
          //     psbt.addOutput({
          //       address: bitcoinAddress,
          //       value: parseInt(changeAmount.toString()),
          //     });
          //   }

          //   const fromHexString = (hexString) =>
          //     Uint8Array.from(
          //       hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
          //     );

          //   const signedPSBTBytes = await (provider as any).signPSBT(
          //     fromHexString(psbt.toHex())
          //   );

          //   // Convert the signed PSBT bytes back to a PSBT object
          //   const signedPSBT = bitcoin.Psbt.fromBase64(
          //     signedPSBTBytes.toString("base64")
          //   );

          //   // Finalize the transaction
          //   signedPSBT.finalizeAllInputs();

          //   // Extract the transaction hex
          //   const transactionHex = signedPSBT.extractTransaction().toHex();

          //   // Broadcast the transaction to the Bitcoin network
          //   const broadcastResponse = await httpInstance.post(
          //     "https://blockstream.info/api/tx", // Use the appropriate endpoint for broadcasting
          //     {
          //       body: transactionHex,
          //       headers: {
          //         "Content-Type": "text/plain",
          //       },
          //     }
          //   );

          //   console.log("Broadcast response:", broadcastResponse.data);
          //   console.log(`Transaction Hash: ${broadcastResponse.data.txid}`);
          // } else {
          throw new Error("Chain not supported");
        }
      }
    } catch (error) {
      console.error("Donation failed:", error);
      alert(`Donation failed. Please try again. Error: ${error}`);
    } finally {
      setSubmitButtonDisabled(false);
      setSubmitButtonText("Donate");
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={buttonClassName}>
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: modalStyles.backgroundColor || "white",
            margin: "auto",
            padding: "20px",
            borderRadius: "10px",
            width: "80%",
            maxWidth: "500px",
            zIndex: 2000,
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          aria-describedby="modal-description"
        >
          <DialogTitle
            style={{
              color: modalStyles.headingColor || "#8A2BE2",
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {modalTitle}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.5rem",
                color: modalStyles.headingColor || "#8A2BE2",
              }}
            >
              &times;
            </button>
          </DialogTitle>

          {showQR ? (
            <div className="flex flex-col items-center p-4">
              <QRCodeSVG value={qrLink} size={256} />
              <Button
                onClick={() => {
                  setShowQR(false);
                }}
                style={{ color: modalStyles.textColor || "#8A2BE2" }}
                className="mt-4"
              >
                Back to Donation Form
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4">
                <button
                  className={`rounded-md w-full flex justify-center`}
                  style={{
                    backgroundColor: modalStyles.buttonColor || "#8A2BE2",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "16px",
                    margin: "4px 2px",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                  onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                >
                  <div className="mx-3 text-white">
                    {currentChainId
                      ? getChainData(chains, currentChainId.toString())
                          ?.networkName
                      : "Select Chain"}
                  </div>
                </button>
                {isChainDropdownOpen && (
                  <div className="absolute mt-2 w-[80%] bg-white rounded-md shadow-lg py-1 z-10 max-h-48 overflow-y-auto">
                    <div className="sticky top-0 bg-white p-2 border-b">
                      <input
                        type="text"
                        placeholder="Search chains..."
                        className="w-full p-2 text-sm border rounded focus:outline-none focus:border-[#8A2BE2] text-[#8A2BE2]"
                        value={chainSearchQuery}
                        onChange={(e) => setChainSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                      />
                    </div>
                    {chains
                      .filter((chain) =>
                        chain.networkIdentifier
                          .toLowerCase()
                          .includes(chainSearchQuery.toLowerCase())
                      )
                      .map((chain) => (
                        <button
                          key={chain.chainId}
                          className="block px-4 py-2 text-sm text-[#8A2BE2] hover:text-white hover:bg-[#8A2BE2] w-full text-left"
                          onClick={() => {
                            setCurrentChainId(chain.chainId);
                            setIsChainDropdownOpen(false);
                            setChainSearchQuery(""); // Reset search when selection is made
                          }}
                        >
                          <img
                            src={chain.chainIconURI}
                            alt={`${chain.networkIdentifier} logo`}
                            className="inline-block w-4 h-4 rounded-full mr-2"
                          />
                          {chain.networkIdentifier}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <button
                  className={`rounded-md w-full flex justify-center`}
                  style={{
                    backgroundColor: modalStyles.buttonColor || "#8A2BE2",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "16px",
                    margin: "4px 2px",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                  onClick={() => {
                    setIsTokenDropdownOpen(!isTokenDropdownOpen);
                  }}
                >
                  <div className="mx-3 text-white">
                    {currentToken?.symbol ?? "Select Token"}
                  </div>
                </button>
                {isTokenDropdownOpen && (
                  <div className="absolute mt-2 w-[80%] bg-white rounded-md shadow-lg py-1 z-10 max-h-48 overflow-y-auto">
                    <div className="sticky top-0 bg-white p-2 border-b">
                      <input
                        type="text"
                        placeholder="Search tokens..."
                        className="w-full p-2 text-sm border rounded focus:outline-none focus:border-[#8A2BE2] text-[#8A2BE2]"
                        value={tokenSearchQuery}
                        onChange={(e) => setTokenSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                      />
                    </div>
                    {tokens
                      .filter((token) =>
                        token.symbol
                          .toLowerCase()
                          .includes(tokenSearchQuery.toLowerCase())
                      )
                      .map((token, idx) => (
                        <button
                          key={idx}
                          className="block px-4 py-2 text-sm text-[#8A2BE2] hover:text-white hover:bg-[#8A2BE2] w-full text-left"
                          onClick={() => {
                            setCurrentToken(token);
                            setIsTokenDropdownOpen(false);
                            setTokenSearchQuery("");
                          }}
                        >
                          <img
                            src={token.logoURI}
                            alt={`${token.symbol} logo`}
                            className="inline-block w-4 h-4 rounded-full mr-2"
                          />
                          {token.symbol}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Donation Amount
                </label>
                <input
                  placeholder="Enter amount"
                  className="w-full p-2 border border-gray-300 bg-white text-gray-700 rounded focus:border-purple-500 focus:ring-purple-500"
                  onChange={(e) => setDonationAmount(e.target.value)}
                />
              </div>

              <div className="flex justify-between mt-4">
                {connected ? (
                  <Button
                    onClick={submitDonation}
                    style={{
                      backgroundColor: modalStyles.buttonColor || "#8A2BE2",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      textAlign: "center",
                      textDecoration: "none",
                      display: "inline-block",
                      fontSize: "16px",
                      margin: "4px 2px",
                      cursor: "pointer",
                      borderRadius: "5px",
                      transition: "background-color 0.3s ease",
                    }}
                    disabled={submitButtonDisabled}
                  >
                    {submitButtonText}
                  </Button>
                ) : (
                  <Button
                    onClick={() => connectWallet()}
                    style={{
                      backgroundColor: modalStyles.buttonColor || "#8A2BE2",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      textAlign: "center",
                      textDecoration: "none",
                      display: "inline-block",
                      fontSize: "16px",
                      margin: "4px 2px",
                      cursor: "pointer",
                      borderRadius: "5px",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    Connect Wallet
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowQR(true);
                    generateQRLink();
                  }}
                  variant="outline"
                  style={{
                    backgroundColor: modalStyles.buttonColor || "#8A2BE2",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "inline-block",
                    fontSize: "16px",
                    margin: "4px 2px",
                    cursor: "pointer",
                    borderRadius: "5px",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  Show QR Code
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Type definitions for better developer experience
export type { DooglyDonateProps, Web3Config };

// Export utility functions for provider setup
export const createCustomProvider = (url: string, chainId: number) => {
  return new ethers.JsonRpcProvider(url, chainId);
};

export const createBrowserProvider = (ethereum: any) => {
  return new ethers.BrowserProvider(ethereum);
};
