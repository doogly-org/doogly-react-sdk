"use client";

import React, { useEffect, useState } from "react";
import { Eip1193Provider, ethers } from "ethers";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/ui/button";
import "../index.css";
declare global {
  interface Window {
    ethereum: Eip1193Provider;
  }
}

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
    splitsAddress?: string;
    hypercertFractionId?: string;
    poolId?: number;
  };
  projectId?: string;
  provider?: ethers.BrowserProvider | ethers.Provider;
  signer?: ethers.JsonRpcSigner;
}

export const DooglyDonateButton: React.FC<DooglyDonateProps> = ({
  buttonText = "Donate with Crypto",
  buttonClassName = "",
  modalTitle = "Make a Donation",
  config: initialConfig = {},
}) => {
  return (
    <DooglyDonateModal
      buttonText={buttonText}
      buttonClassName={buttonClassName}
      modalTitle={modalTitle}
      config={initialConfig}
    />
  );
};

const DooglyDonateModal: React.FC<Omit<DooglyDonateProps, "web3Config">> = ({
  buttonText,
  buttonClassName,
  modalTitle,
  config: initialConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [uniswapTokens, setUniswapTokens] = useState<{ [key: string]: any }>(
    {}
  );
  const [provider, setProvider] = useState<
    ethers.BrowserProvider | ethers.Provider | null
  >(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [network, setNetwork] = useState<ethers.Network>();
  const [initialized, setInitialized] = useState(false);
  const [config, setConfig] = useState(initialConfig);
  const [selectedToken, setSelectedToken] = useState("");

  const account = signer;
  const [donationAmount, setDonationAmount] = useState("0");
  const [walletAddressInput, setWalletAddressInput] = useState("");
  const [submitButtonText, setSubmitButtonText] = useState("Donate");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [swapperBridgerContract, setSwapperBridgerContract] =
    useState<ethers.Contract>();

  const swapperBridgerABI = [
    {
      inputs: [],
      name: "USDC",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "destinationChain",
          type: "string",
        },
        {
          internalType: "string",
          name: "destinationAddress",
          type: "string",
        },
        {
          internalType: "address",
          name: "hcRecipientAddress",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "poolId",
          type: "uint256",
        },
        {
          internalType: "address payable",
          name: "_splitsAddress",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_hypercertFractionId",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "inputTokenAddress",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
        },
      ],
      name: "sendDonation",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "UNISWAP_V3_FACTORY",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

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
  ];

  useEffect(() => {
    const initialize = async () => {
      if (!config.destinationChain) {
        // Fetch default config if not provided
        const response = await fetch(`/api`);
        const data = await response.json();
        setConfig({
          ...data,
          hypercertFractionId: BigInt(data.hypercertFractionId) + BigInt(1),
        });
      }
      const net = await provider.getNetwork();
      setNetwork(net);
      setWalletAddressInput(signer.address);

      const sbContract = new ethers.Contract(
        getChainParams(parseInt(net.chainId.toString())).swapperBridgerContract,
        swapperBridgerABI,
        signer
      );

      setSwapperBridgerContract(sbContract);
    };

    if (signer && !initialized) {
      initialize();
      setInitialized(true);
    }
  }, [signer, initialized]);

  useEffect(() => {
    const initializePools = async () => {
      const uniswaptokens = await fetchUserTokensAndUniswapPools(
        parseInt(network.chainId.toString())
      );
      setUniswapTokens(uniswaptokens);
    };

    if (swapperBridgerContract && network) {
      initializePools();
    }
  }, [signer, network]);

  function updateInputTokenAddress(val) {
    setSelectedToken(val);
  }

  async function switchChain(chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [getChainParams(chainId)],
          });
        } catch (addError) {
          throw new Error("Failed to add the network to MetaMask");
        }
      } else {
        throw new Error("Failed to switch network in MetaMask");
      }
    }
  }

  const connectWallet = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const signer = await web3Provider.getSigner();
      setSigner(signer);
      setProvider(web3Provider);
    } else {
      alert("Please install MetaMask!");
    }
  };

  // const chainSelectEl = document.getElementById("crypto-donate-chain");
  const chainSelect = async (newChainId: number) => {
    if (BigInt(newChainId) !== network?.chainId) {
      try {
        await switchChain(newChainId);

        const newUniswapTokens = await fetchUserTokensAndUniswapPools(
          newChainId
        );

        setUniswapTokens(newUniswapTokens);
      } catch (error) {
        console.error("Failed to switch chain:", error);
      }
    }
  };

  async function submitDonation() {
    const amount = donationAmount;
    if (!amount) return;

    const inputTokenAddress = uniswapTokens[selectedToken].address;

    setSubmitButtonDisabled(true);
    setSubmitButtonText("Processing...");

    try {
      let tx;
      if (selectedToken === "native") {
        // For native token transactions
        tx = await swapperBridgerContract.sendDonation(
          config.destinationChain,
          config.destinationAddress,
          walletAddressInput,
          config.poolId,
          config.splitsAddress,
          config.hypercertFractionId,
          "0x0000000000000000000000000000000000000000", // native token
          ethers.parseEther(amount),
          {
            value: BigInt(100000000000000) + ethers.parseEther(amount),
            gasLimit: 300000,
          }
        );
      } else {
        // For ERC20 token transactions
        const donationAmount = ethers.parseUnits(
          String(amount),
          uniswapTokens[selectedToken].decimals
        );

        const erc20Contract = new ethers.Contract(
          inputTokenAddress,
          erc20ContractABI,
          account
        );

        // Check current allowance
        // @ts-ignore
        const currentAllowance = await erc20Contract.allowance(
          account?.address,
          await swapperBridgerContract.getAddress()
        );

        // If current allowance is less than donation amount, request approval
        if (Number(currentAllowance) < donationAmount) {
          const approveTx = await erc20Contract.approve(
            getChainParams(parseInt(network.chainId.toString()))
              .swapperBridgerContract,
            donationAmount,
            {
              gasLimit: 300000,
            }
          );
          await approveTx.wait();
        }

        // Send the donation
        // @ts-ignore
        tx = await swapperBridgerContract.sendDonation(
          config.destinationChain,
          config.destinationAddress,
          walletAddressInput,
          config.poolId,
          config.splitsAddress,
          config.hypercertFractionId,
          inputTokenAddress,
          donationAmount,
          { gasLimit: 300000, value: BigInt(1000000000000000) } // Adjust this value based on your contract's gas requirements
        );
      }

      await tx.wait();

      alert("Donation successful!");
      setSubmitButtonText("Donation Successful!");
    } catch (error) {
      console.error("Donation failed:", error);
      alert("Donation failed. Please try again.");
    } finally {
      setSubmitButtonDisabled(false);
      setSubmitButtonText("Donate");
    }
  }

  async function fetchUserTokensAndUniswapPools(chainId: number) {
    const tokens = { native: getNativeToken(chainId) };
    // Fetch user's ERC20 tokens
    const userTokens = await fetchUserERC20Tokens(account?.address, chainId);

    try {
      const stablecoinAddress = await swapperBridgerContract.USDC();

      tokens["USDC"] = {
        symbol: "USDC",
        name: "USDC",
        address: stablecoinAddress,
        decimals: 6,
      };

      const uniswapFactoryAddress =
        await swapperBridgerContract.UNISWAP_V3_FACTORY();

      const uniswapV3FactoryContract = new ethers.Contract(
        uniswapFactoryAddress,
        [
          "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
        ],
        signer
      );

      for (const token of userTokens) {
        try {
          // Check if there's a pool with the stablecoin for this token
          const poolAddress = await uniswapV3FactoryContract.getPool(
            stablecoinAddress,
            token.address,
            3000
          );

          if (
            poolAddress != ethers.ZeroAddress ||
            token.address == stablecoinAddress
          ) {
            tokens[token.symbol] = {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: parseInt(token.decimals),
            };
          }
        } catch (error) {
          console.error(`Error checking pool for ${token.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error("Error fetching addresses from contract:", error);
    }

    setUniswapTokens(tokens);
    return tokens;
  }

  async function fetchUserERC20Tokens(userAddress: string, chainId: number) {
    if (!userAddress || !chainId) {
      return [];
    }

    const apiUrl = getExplorerApiUrl(chainId);
    const apiKey = getExplorerApiKey(chainId);

    if (!apiUrl || !apiKey) {
      console.error("Unsupported chain");
      return [];
    }

    const url = `${apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "1") {
        console.error("Explorer API request failed");
        return [];
      }

      const uniqueTokens = new Set();
      const userTokens = [];
      for (const tx of data.result) {
        if (!uniqueTokens.has(tx.contractAddress)) {
          uniqueTokens.add(tx.contractAddress);
          userTokens.push({
            address: tx.contractAddress,
            symbol: tx.tokenSymbol,
            name: tx.tokenName,
            decimals: tx.tokenDecimal,
          });
        }
      }

      // Check balances and filter out tokens with zero balance
      const tokensWithBalance = [];
      for (const token of userTokens) {
        const contract = new ethers.Contract(
          token.address,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );

        const balance = await contract.balanceOf(userAddress);

        if (balance > 0) {
          tokensWithBalance.push(token);
        }
      }

      return tokensWithBalance;
    } catch (error) {
      console.error("Failed to fetch user ERC20 tokens:", error);
      return [];
    }
  }

  function getNativeToken(chainId: number) {
    const nativeTokens = {
      10: {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x0000000000000000000000000000000000000000",
      },
      8453: {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x0000000000000000000000000000000000000000",
      },
    };
    return (
      nativeTokens[chainId] || {
        symbol: "NATIVE",
        name: "Native Token",
        address: "0x0000000000000000000000000000000000000000",
      }
    );
  }

  function getExplorerApiUrl(chainId: number) {
    const apiUrls = {
      10: "https://api-optimistic.etherscan.io/api",
      8453: "https://api.basescan.org/api",
    };
    return apiUrls[chainId];
  }

  function getExplorerApiKey(chainId: number) {
    const apiKeys = {
      10: "9HBFD3UFSTQV71132ZASZ4T6M6Y1VHDGKM",
      8453: "X4R5GNYKKD34HKQGEVC6SXGHI62EGUYNJ8",
      42220: "4MY7GCBJXMB181R771BY5HRSCAQN2PXTUN",
    };
    return apiKeys[chainId];
  }

  function getChainParams(chainId: number) {
    const chains = {
      10: {
        chainId: "0xA",
        chainName: "Optimism",
        AxelarChainName: "optimism",
        nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://mainnet.optimism.io"],
        blockExplorerUrls: ["https://optimistic.etherscan.io"],
        swapperBridgerContract: "0x8a4c14d50c43363a28647188534db7004112091c",
      },
      8453: {
        chainId: "0x2105",
        chainName: "Base",
        AxelarChainName: "base",
        nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://mainnet.base.org"],
        blockExplorerUrls: ["https://basescan.org"],
        swapperBridgerContract: "0xeD99908D0697C408b26Ba35fE0800e565042c858",
      },
      42220: {
        chainId: "0xA4EC",
        chainName: "Celo",
        AxelarChainName: "celo",
        nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
        rpcUrls: ["https://forno.celo.org"],
        blockExplorerUrls: ["https://explorer.celo.org"],
      },
    };
    return chains[chainId];
  }

  const chainOptions = [
    { id: 10, name: "OP Mainnet" },
    { id: 8453, name: "Base" },
  ];

  return (
    <>
      {/* {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
            backdropFilter: "blur(5px)", // Blur effect
            zIndex: 1000, // Ensure it's below the modal
          }}
        />
      )} */}
      <Button onClick={() => setIsOpen(true)} className={buttonClassName}>
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            backgroundColor: "white",
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
              color: "#892BE2",
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
                color: "#892BE2",
              }}
            >
              &times;
            </button>
          </DialogTitle>

          {showQR ? (
            <div className="flex flex-col items-center p-4">
              <QRCodeSVG
                value={`https://app.doogly.org/donate${config.hypercertFractionId}`}
                size={256}
              />
              <Button
                onClick={() => setShowQR(false)}
                className="mt-4 text-grey-700"
              >
                Back to Donation Form
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {signer ? (
                <>
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                      value={walletAddressInput}
                      onChange={(e) => setWalletAddressInput(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Select Chain
                    </label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                      onChange={(e) => chainSelect(parseInt(e.target.value))}
                    >
                      {chainOptions.map((chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                          selected={BigInt(chain.id) === network?.chainId}
                        >
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Select Token
                    </label>
                    {Object.entries(uniswapTokens).length > 0 ? (
                      <select
                        className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                        onChange={(e) =>
                          updateInputTokenAddress(e.target.value)
                        }
                      >
                        {Object.entries(uniswapTokens).map(
                          ([symbol, token]) => (
                            <option key={symbol} value={symbol}>
                              {token.name} ({symbol})
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-700">
                        loading...
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
                    <Button
                      onClick={submitDonation}
                      className="flex-1"
                      style={{
                        backgroundColor: "#8A2BE2",
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
                    <Button
                      onClick={() => setShowQR(true)}
                      variant="outline"
                      style={{
                        backgroundColor: "#8A2BE2",
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
                </>
              ) : (
                <div className="space-y-4 flex justify-between">
                  <Button
                    onClick={() => connectWallet()}
                    style={{
                      backgroundColor: "#8A2BE2",
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
                  <Button
                    onClick={() => setShowQR(true)}
                    variant="outline"
                    style={{
                      backgroundColor: "#8A2BE2",
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
              )}
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
