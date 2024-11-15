"use client";

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Config,
  // createConfig,
  useAccount,
  // usePublicClient,
  useSwitchChain,
  // useWalletClient,
  useWriteContract,
  http,
  WagmiProvider,
} from "wagmi";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getContract,
  PublicClient,
} from "viem";
import {
  ConnectButton,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/ui/button";
import { base, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface Web3Config {
  provider?: ethers.JsonRpcProvider | ethers.BrowserProvider;
  wagmiConfig?: Config;
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
}

// Function to create default wagmi config if none provided
const createDefaultWagmiConfig = (chains, projectId) => {
  return getDefaultConfig({
    appName: "Doogly Donation",
    projectId: projectId, // Users should provide their own WalletConnect project ID
    chains,
  });
};

export const DooglyDonateButton: React.FC<DooglyDonateProps> = ({
  buttonText = "Donate with Crypto",
  buttonClassName = "",
  modalTitle = "Make a Donation",
  web3Config = {},
  config: initialConfig = {},
  projectId = "",
}) => {
  return (
    <WagmiConfigWrapper web3Config={web3Config} projectId={projectId}>
      <DooglyDonateModal
        buttonText={buttonText}
        buttonClassName={buttonClassName}
        modalTitle={modalTitle}
        config={initialConfig}
      />
    </WagmiConfigWrapper>
  );
};

// Wrapper component to handle Web3 provider configuration
const WagmiConfigWrapper: React.FC<{
  web3Config: Web3Config;
  projectId: String;
  children: React.ReactNode;
}> = ({ web3Config, projectId, children }) => {
  const [wagmiConfig, setWagmiConfig] = useState<Config | null>(null);

  useEffect(() => {
    const initializeConfig = async () => {
      if (web3Config.wagmiConfig) {
        setWagmiConfig(web3Config.wagmiConfig);
        // } else if (web3Config.provider) {
        //   // Create wagmi config from provided provider
        //   const provider = web3Config.provider;

        //   const config = createConfig({
        //     chains: [base, optimism],
        //     transports: {
        //       [base.id]: http(),
        //       [optimism.id]: http(),
        //     },
        //   });

        //   setWagmiConfig(config);
      } else {
        // Create default config
        const config = createDefaultWagmiConfig([base, optimism], projectId);
        setWagmiConfig(config);
      }
    };

    initializeConfig();
  }, [web3Config]);

  // if (!wagmiConfig) {
  //   return null; // or loading indicator
  // }

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
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
  const [initialized, setInitialized] = useState(false);
  const [config, setConfig] = useState(initialConfig);
  const [selectedToken, setSelectedToken] = useState("");

  const account = useAccount();
  const sendDonation = useWriteContract();
  const switchChain = useSwitchChain();
  const erc20Write = useWriteContract();
  const publicClient = createPublicClient({
    chain: account.chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: account.chain,
    // @ts-ignore
    transport: window?.ethereum ? custom(window?.ethereum) : http(),
  });
  const [donationAmount, setDonationAmount] = useState("0");
  const [walletAddressInput, setWalletAddressInput] = useState(
    account.address as string
  );
  const [submitButtonText, setSubmitButtonText] = useState("Donate");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);

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

  const uniswapFactoryABI = [
    {
      inputs: [
        { internalType: "address", name: "", type: "address" },
        { internalType: "address", name: "", type: "address" },
        { internalType: "uint24", name: "", type: "uint24" },
      ],
      name: "getPool",
      outputs: [{ internalType: "address", name: "", type: "address" }],
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

      const uniswaptokens = await fetchUserTokensAndUniswapPools(
        account.chainId
      );
      setUniswapTokens(uniswaptokens);
    };

    if (account.isConnected && !initialized) {
      initialize();
      setInitialized(true);
    }
  }, [account, initialized]);

  function updateInputTokenAddress(val) {
    setSelectedToken(val);
  }

  const swapperBridgerContract = getContract({
    address: getChainParams(account.chainId)
      ?.swapperBridgerContract as `0x${string}`,
    abi: swapperBridgerABI,

    client: {
      // @ts-ignore
      public: publicClient,
      // @ts-ignore
      wallet: walletClient,
    },
  });

  // const chainSelectEl = document.getElementById("crypto-donate-chain");
  const chainSelect = async (newChainId: number) => {
    if (newChainId !== account.chainId) {
      try {
        console.log(newChainId);
        await switchChain.switchChainAsync({ chainId: newChainId });

        if (switchChain.isSuccess) {
          const newUniswapTokens = await fetchUserTokensAndUniswapPools(
            newChainId
          );

          setUniswapTokens(newUniswapTokens);
        }

        if (switchChain.error) {
          console.log(switchChain.error);
          throw new Error(switchChain.error.message);
        }
      } catch (error) {
        console.error("Failed to switch chain:", error);
        // chainSelectEl.value = account.chainId;
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
      if (selectedToken === "native") {
        // For native token transactions
        // @ts-ignore
        await sendDonation.writeContractAsync({
          address: getChainParams(account.chainId as number)
            .swapperBridgerContract,
          abi: swapperBridgerABI,
          functionName: "sendDonation",
          args: [
            config.destinationChain,
            config.destinationAddress,
            walletAddressInput,
            config.poolId,
            config.splitsAddress,
            config.hypercertFractionId,
            "0x0000000000000000000000000000000000000000", // native token
            ethers.parseEther(amount),
          ],
          value: BigInt(100000000000000) + ethers.parseEther(amount),
        });
      } else {
        // For ERC20 token transactions
        const donationAmount = ethers.parseUnits(
          String(amount),
          uniswapTokens[selectedToken].decimals
        );

        const erc20Contract = getContract({
          address: inputTokenAddress,
          abi: erc20ContractABI,
          client: {
            // @ts-ignore
            public: publicClient as PublicClient,
            wallet: {
              // @ts-ignore
              account: account,
            },
          },
        });

        // Check current allowance
        // @ts-ignore
        const currentAllowance = await erc20Contract.read.allowance([
          account.address,
          swapperBridgerContract.address,
        ]);

        // If current allowance is less than donation amount, request approval
        if (Number(currentAllowance) < donationAmount) {
          await erc20Write.writeContractAsync({
            address: inputTokenAddress,
            account: account.address,
            chain: {
              id: base.id,
              name: base.name,
              rpcUrls: base.rpcUrls,
              nativeCurrency: base.nativeCurrency,
            },
            abi: erc20ContractABI,
            functionName: "approve",
            args: [swapperBridgerContract.address, donationAmount],
          });
        }

        // Send the donation
        // @ts-ignore
        await sendDonation.writeContractAsync({
          address: getChainParams(account.chainId).swapperBridgerContract,
          abi: swapperBridgerABI,
          functionName: "sendDonation",
          args: [
            config.destinationChain,
            config.destinationAddress,
            walletAddressInput,
            config.poolId,
            config.splitsAddress,
            config.hypercertFractionId,
            inputTokenAddress,
            donationAmount,
          ],
          value: BigInt(1000000000000000),
        });
      }

      if (sendDonation.isSuccess) {
        alert("Donation successful!");
        setSubmitButtonText("Donate");
      }
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
    const userTokens = await fetchUserERC20Tokens(account.address, chainId);

    try {
      for (const token of userTokens) {
        try {
          // @ts-ignore
          const stablecoinAddress = await swapperBridgerContract.read.USDC();

          tokens["USDC"] = {
            symbol: "USDC",
            name: "USDC",
            address: stablecoinAddress,
            decimals: 6,
          };

          const uniswapFactoryAddress =
            // @ts-ignore
            await swapperBridgerContract.read.UNISWAP_V3_FACTORY();

          const uniswapV3FactoryContract = getContract({
            address: uniswapFactoryAddress as `0x${string}`,
            abi: uniswapFactoryABI,
            // @ts-ignore
            client: publicClient as PublicClient,
          });

          // Check if there's a pool with the stablecoin for this token
          // @ts-ignore
          const poolAddress = await uniswapV3FactoryContract.read.getPool([
            stablecoinAddress,
            token.address,
            3000,
          ]);

          if (
            poolAddress != ethers.ZeroAddress ||
            token.address == stablecoinAddress
          ) {
            tokens[token.symbol] = {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: token,
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
        const contract = getContract({
          address: token.address,
          abi: erc20ContractABI,
          client: {
            // @ts-ignore
            public: publicClient,
          },
        });

        // @ts-ignore
        const balance = await contract.read.balanceOf([userAddress]);

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

  const donationUrl = `https://app.doogly.org/donate`;

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={buttonClassName}>
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{modalTitle}</DialogTitle>

          {showQR ? (
            <div className="flex flex-col items-center p-4">
              <QRCodeSVG value={donationUrl} size={256} />
              <Button onClick={() => setShowQR(false)} className="mt-4">
                Back to Donation Form
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {account.isConnected ? (
                <>
                  <div>
                    <ConnectButton />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Wallet Address
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      value={walletAddressInput}
                      onChange={(e) => setWalletAddressInput(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Chain
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      onChange={(e) => chainSelect(parseInt(e.target.value))}
                    >
                      {switchChain.chains.map((chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                          selected={chain.id === account.chainId}
                        >
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Token
                    </label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      onChange={(e) => updateInputTokenAddress(e.target.value)}
                    >
                      {Object.entries(uniswapTokens).map(([symbol, token]) => (
                        <option key={symbol} value={symbol}>
                          {token.name} ({symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Donation Amount
                    </label>
                    <input
                      placeholder="Enter amount"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      onChange={(e) => setDonationAmount(e.target.value)}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={submitDonation}
                      className="flex-1"
                      disabled={submitButtonDisabled}
                    >
                      {submitButtonText}
                    </Button>
                    <Button onClick={() => setShowQR(true)} variant="outline">
                      Show QR Code
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <ConnectButton />
                  <Button
                    onClick={() => setShowQR(true)}
                    variant="outline"
                    className="w-full"
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
