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
        internalType: "address",
        name: "destinationOutputTokenAddress",
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

function getNativeToken(chainId: number) {
  const nativeTokens = {
    10: {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      axlGas: BigInt(1000000000000000),
    },
    8453: {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      axlGas: BigInt(1000000000000000),
    },
    42220: {
      symbol: "CELO",
      name: "Celo",
      address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
      decimals: 18,
      axlGas: BigInt("500000000000000000"),
    },
    42161: {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      axlGas: BigInt(1000000000000000),
    },
    137: {
      symbol: "POL",
      name: "Polygon",
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
      axlGas: BigInt("500000000000000000"),
    },
    43114: {
      symbol: "AVAX",
      name: "Avalanche",
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
      axlGas: BigInt("10000000000000000"),
    },
    56: {
      symbol: "BNB",
      name: "Binance",
      address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      decimals: 18,
      axlGas: BigInt("1000000000000000"),
    },
  };
  return (
    nativeTokens[chainId] || {
      symbol: "NATIVE",
      name: "Native Token",
      address: "0x0000000000000000000000000000000000000000",
      axlGas: BigInt("1000000000000000"),
    }
  );
}

function getExplorerApiUrl(chainId: number) {
  const apiUrls = {
    10: "https://api-optimistic.etherscan.io/api",
    8453: "https://api.basescan.org/api",
    42161: "https://api.arbiscan.io/api",
    42220: "https://api.celoscan.io/api",
    137: "https://api.polygonscan.com/api",
    43114:
      "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api",
    56: "https://api.bscscan.com/api",
  };
  return apiUrls[chainId];
}

function getExplorerApiKey(chainId: number) {
  const apiKeys = {
    10: "9HBFD3UFSTQV71132ZASZ4T6M6Y1VHDGKM",
    8453: "X4R5GNYKKD34HKQGEVC6SXGHI62EGUYNJ8",
    42220: "4MY7GCBJXMB181R771BY5HRSCAQN2PXTUN",
    42161: "VU2ZRHTKI2HFMEBAVXV5WSN9KZRGEB8841",
    137: "CHQNNG2ZEAYR98XNZYKEK135P8Y6TUIENH",
    43114: "",
    56: "YPTGHNWQ9SFSIZHRBKUPGSWP31CUZG17CG",
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
      swapperBridgerContract: "0x3652eC40C4D8F3e804373455EF155777F250a6E2",
      hyperMinter: "0x822F17A9A5EeCFd66dBAFf7946a8071C265D1d07",
    },
    8453: {
      chainId: "0x2105",
      chainName: "Base",
      AxelarChainName: "base",
      nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://mainnet.base.org"],
      blockExplorerUrls: ["https://basescan.org"],
      swapperBridgerContract: "0xe0E84235511aC6437C756C1d70e8cCdd8917df36",
      hyperMinter: "0xC2d179166bc9dbB00A03686a5b17eCe2224c2704",
    },
    42220: {
      chainId: "0xA4EC",
      chainName: "Celo",
      AxelarChainName: "celo",
      nativeCurrency: { name: "Celo", symbol: "CELO", decimals: 18 },
      rpcUrls: ["https://forno.celo.org"],
      blockExplorerUrls: ["https://explorer.celo.org"],
      swapperBridgerContract: "0xFa1aD6310C6540c5430F9ddA657FCE4BdbF1f4df",
      hyperMinter: "0x16bA53B74c234C870c61EFC04cD418B8f2865959",
    },
    42161: {
      chainId: "0xa4b1",
      chainName: "Arbitrum",
      AxelarChainName: "arbitrum",
      nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
      blockExplorerUrls: ["https://arbiscan.io"],
      swapperBridgerContract: "0xb66f6DAC6F61446FD88c146409dA6DA8F8F10f73",
      hyperMinter: "0x822F17A9A5EeCFd66dBAFf7946a8071C265D1d07",
    },
    137: {
      chainId: "0x89",
      chainName: "Polygon",
      AxelarChainName: "Polygon",
      nativeCurrency: { name: "Polygon", symbol: "POL", decimals: 18 },
      rpcUrls: ["https://polygon-mainnet.infura.io"],
      blockExplorerUrls: ["https://polygonscan.com"],
      swapperBridgerContract: "0x1E1461464852d6FbF8a19097d14408d657d49457",
    },
    43114: {
      chainId: "0xa86a",
      chainName: "Avalanche C-Chain",
      AxelarChainName: "Avalanche",
      nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
      rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
      blockExplorerUrls: ["https://snowtrace.io"],
      swapperBridgerContract: "0x1E1461464852d6FbF8a19097d14408d657d49457",
    },
    56: {
      chainId: "0x38",
      chainName: "Binance Smart Chain",
      AxelarChainName: "binance",
      nativeCurrency: { name: "Binance", symbol: "BNB", decimals: 18 },
      rpcUrls: ["https://bsc-dataseed.bnbchain.org"],
      blockExplorerUrls: ["https://bscscan.com"],
      swapperBridgerContract: "0x73F9fEBd723ebcaa23A6DEd587afbF2a503B303f",
    },
  };
  return chains[chainId];
}

const chainOptions = [
  { id: 10, name: "OP Mainnet" },
  { id: 8453, name: "Base" },
  { id: 42220, name: "Celo" },
  { id: 42161, name: "Arbitrum" },
  { id: 137, name: "Polygon" },
  { id: 43114, name: "Avalanche" },
  { id: 56, name: "BSC Mainnet" },
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
    splitsAddress?: string;
    hypercertFractionId?: string;
    poolId?: number;
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
}

export const DooglyDonateButton: React.FC<DooglyDonateProps> = ({
  buttonText = "Donate with Crypto",
  buttonClassName = "",
  modalTitle = "Make a Donation",
  config: initialConfig = {},
  modalStyles = {},
}) => {
  return (
    <DooglyDonateModal
      buttonText={buttonText}
      buttonClassName={buttonClassName}
      modalTitle={modalTitle}
      config={initialConfig}
      modalStyles={modalStyles}
    />
  );
};

const DooglyDonateModal: React.FC<Omit<DooglyDonateProps, "web3Config">> = ({
  buttonText,
  buttonClassName,
  modalTitle,
  config: initialConfig,
  modalStyles,
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
  const [selectedToken, setSelectedToken] = useState("native");
  const [currentChainId, setCurrentChainId] = useState<bigint>();

  const [donationAmount, setDonationAmount] = useState("0");
  const [walletAddressInput, setWalletAddressInput] = useState("");
  const [submitButtonText, setSubmitButtonText] = useState("Donate");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [swapperBridgerContract, setSwapperBridgerContract] =
    useState<ethers.Contract>();

  const QRLink = `https://app.doogly.org/donate/${config.hypercertFractionId}`;

  useEffect(() => {
    const initialize = async () => {
      if (!config.destinationChain) {
        try {
          const response = await fetch(
            `https://app.doogly.org/api?id=${config.hypercertFractionId}`
          );

          const text = await response.text(); // Get the response as text

          if (!response.ok) {
            throw new Error(
              `Failed to fetch default config: ${response.statusText}`
            );
          }

          if (text.trim() === "") {
            throw new Error("Received empty response from API");
          }

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error(
              "Expected JSON response but received: " + contentType
            );
          }

          const data = JSON.parse(text); // Parse the text as JSON
          setConfig({
            ...data,
            hypercertFractionId: BigInt(data.hypercertFractionId) + BigInt(1),
          });
        } catch (error) {
          console.error("Error initializing config:", error);
          // Handle the error appropriately (e.g., set default config, alert user, etc.)
        }
      }
      const net = await provider.getNetwork();
      setNetwork(net);
      setWalletAddressInput(signer.address);
      setCurrentChainId(net.chainId);

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

  useEffect(() => {
    const updateProviders = async (chainId: number) => {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const net = await web3Provider.getNetwork();
        setNetwork(net);
        setSigner(signer);
        setProvider(web3Provider);

        const sbContract = new ethers.Contract(
          getChainParams(chainId).swapperBridgerContract,
          swapperBridgerABI,
          signer
        );

        setSwapperBridgerContract(sbContract);
      } catch (e) {
        console.error(e);
      }
    };

    if (initialized) {
      updateProviders(parseInt(currentChainId?.toString()));
    }
  }, [currentChainId]);

  function updateInputTokenAddress(val) {
    setSelectedToken(val);
  }

  async function switchChain(chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setCurrentChainId(chainId);
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

  const chainSelect = async (newChainId: number) => {
    if (BigInt(newChainId) !== network?.chainId) {
      try {
        setUniswapTokens({});
        await switchChain(newChainId);
        setCurrentChainId(BigInt(newChainId));
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
      if (
        inputTokenAddress === "0x0000000000000000000000000000000000000000" ||
        inputTokenAddress === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // For native token transactions
        tx = await swapperBridgerContract.sendDonation(
          config.destinationChain,
          config.destinationAddress,
          walletAddressInput,
          config.poolId,
          config.splitsAddress,
          config.hypercertFractionId,
          inputTokenAddress, // native token
          config.destinationOutputTokenAddress,
          ethers.parseEther(amount),
          {
            value:
              getNativeToken(parseInt(currentChainId.toString())).axlGas +
              ethers.parseEther(amount),
            gasLimit: 500000,
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
          signer
        );

        // Check current allowance
        // @ts-ignore
        const currentAllowance = await erc20Contract.allowance(
          signer?.address,
          await swapperBridgerContract.getAddress()
        );

        // If current allowance is less than donation amount, request approval
        if (Number(currentAllowance) < donationAmount) {
          const approveTx = await erc20Contract.approve(
            getChainParams(parseInt(network.chainId.toString()))
              .swapperBridgerContract,
            donationAmount,
            {
              gasLimit: 500000,
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
          config.destinationOutputTokenAddress,
          donationAmount,
          {
            gasLimit: 500000,
            value: getNativeToken(parseInt(currentChainId.toString())).axlGas,
          } // Adjust this value based on your contract's gas requirements
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
    const userTokens = await fetchUserERC20Tokens(signer?.address, chainId);

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
          const feeTiers = [3000, 10000, 500, 100];
          for (let j = 0; j < feeTiers.length; j++) {
            const poolAddress = await uniswapV3FactoryContract.getPool(
              stablecoinAddress,
              token.address,
              feeTiers[j]
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

              break;
            }
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

      return userTokens;
    } catch (error) {
      console.error("Failed to fetch user ERC20 tokens:", error);
      return [];
    }
  }

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
              color: modalStyles.headingColor || "#892BE2",
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
                color: modalStyles.headingColor || "#892BE2",
              }}
            >
              &times;
            </button>
          </DialogTitle>

          {showQR ? (
            <div className="flex flex-col items-center p-4">
              <QRCodeSVG value={QRLink} size={256} />
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
                    {network?.chainId ? (
                      <select
                        className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                        onChange={(e) => chainSelect(parseInt(e.target.value))}
                        defaultValue={parseInt(network.chainId.toString())}
                      >
                        {chainOptions.map((chain) => (
                          <option
                            key={chain.id}
                            value={chain.id}
                            // selected={BigInt(chain.id) === network?.chainId}
                          >
                            {chain.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-700">
                        loading...
                      </div>
                    )}
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
                    <Button
                      onClick={() => setShowQR(true)}
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
                </>
              ) : (
                <div className="space-y-4 flex justify-between">
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
                  <Button
                    onClick={() => setShowQR(true)}
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
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

interface DooglyTippingProps {
  buttonText?: string;
  buttonClassName?: string;
  modalTitle?: string;
  web3Config?: Web3Config;
  config: {
    destinationChain: string;
    destinationAddress: string;
    destinationOutputTokenAddress: string;
    receiverAddress: string;
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
}

export const DooglyTippingButton: React.FC<DooglyTippingProps> = ({
  buttonText = "Tip with Crypto",
  buttonClassName = "",
  modalTitle = "Make a Donation",
  config: initialConfig = {
    receiverAddress: "",
    destinationAddress: "",
    destinationChain: "celo",
    destinationOutputTokenAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  },
  modalStyles = {},
}) => {
  return (
    <DooglyTippingModal
      buttonText={buttonText}
      buttonClassName={buttonClassName}
      modalTitle={modalTitle}
      config={initialConfig}
      modalStyles={modalStyles}
    />
  );
};

const DooglyTippingModal: React.FC<Omit<DooglyTippingProps, "web3Config">> = ({
  buttonText,
  buttonClassName,
  modalTitle,
  config: initialConfig,
  modalStyles,
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
  const [selectedToken, setSelectedToken] = useState("native");
  const [currentChainId, setCurrentChainId] = useState<bigint>();

  const [donationAmount, setDonationAmount] = useState("0");
  const [walletAddressInput, setWalletAddressInput] = useState("");
  const [submitButtonText, setSubmitButtonText] = useState("Donate");
  const [submitButtonDisabled, setSubmitButtonDisabled] = useState(false);
  const [swapperBridgerContract, setSwapperBridgerContract] =
    useState<ethers.Contract>();

  const QRLink = `https://app.doogly.org/tip/${config.receiverAddress}/${config.destinationChain}/${config.destinationOutputTokenAddress}`;

  useEffect(() => {
    const initialize = async () => {
      const ensprovider = new ethers.JsonRpcProvider("https://eth.drpc.org");
      const resolvedAddress = await ensprovider.resolveName(
        config.receiverAddress
      );

      if (resolvedAddress) {
        setConfig({
          destinationAddress: config.destinationAddress,
          destinationChain: config.destinationChain,
          destinationOutputTokenAddress: config.destinationOutputTokenAddress,
          receiverAddress: resolvedAddress,
        });

        setWalletAddressInput(resolvedAddress);
      } else {
        setWalletAddressInput(config.receiverAddress);
      }

      const net = await provider.getNetwork();
      setNetwork(net);
      setCurrentChainId(net.chainId);

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
  }, [signer, network?.chainId]);

  useEffect(() => {
    const updateProviders = async (chainId: number) => {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await web3Provider.getSigner();
        const net = await web3Provider.getNetwork();
        setNetwork(net);
        setSigner(signer);
        setProvider(web3Provider);

        const sbContract = new ethers.Contract(
          getChainParams(chainId).swapperBridgerContract,
          swapperBridgerABI,
          signer
        );

        setSwapperBridgerContract(sbContract);
      } catch (e) {
        console.error(e);
      }
    };

    if (initialized) {
      updateProviders(parseInt(currentChainId?.toString()));
    }
  }, [currentChainId]);

  function updateInputTokenAddress(val: React.SetStateAction<string>) {
    setSelectedToken(val);
  }

  async function switchChain(chainId: number) {
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
        console.error(switchError);
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

  const chainSelect = async (newChainId: number) => {
    if (BigInt(newChainId) !== network?.chainId) {
      try {
        setUniswapTokens({});
        await switchChain(newChainId);
        setCurrentChainId(BigInt(newChainId));
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

    // const sdk = new AxelarQueryAPI({
    //   environment: "mainnet" as Environment,
    // });

    // const estimatedGas = await sdk.estimateGasFee(
    //   getChainParams(parseInt(network.chainId.toString())).AxelarChainName,
    //   config.destinationChain,
    //   BigInt(500000),
    //   getNativeToken(parseInt(network.chainId.toString())).symbol
    // );

    try {
      let tx;
      if (
        inputTokenAddress == "0x0000000000000000000000000000000000000000" ||
        inputTokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
      ) {
        // For native token transactions
        tx = await swapperBridgerContract.sendDonation(
          config.destinationChain,
          config.destinationAddress,
          signer.address,
          0,
          walletAddressInput,
          0,
          inputTokenAddress, // native token
          config.destinationOutputTokenAddress,
          ethers.parseEther(amount),
          {
            value:
              getNativeToken(parseInt(currentChainId.toString())).axlGas +
              ethers.parseEther(amount),
            gasLimit: 500000,
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
          signer
        );

        // Check current allowance
        // @ts-ignore
        const currentAllowance = await erc20Contract.allowance(
          signer?.address,
          await swapperBridgerContract.getAddress()
        );

        // If current allowance is less than donation amount, request approval
        if (Number(currentAllowance) < donationAmount) {
          const approveTx = await erc20Contract.approve(
            getChainParams(parseInt(network.chainId.toString()))
              .swapperBridgerContract,
            donationAmount,
            {
              gasLimit: 500000,
            }
          );
          await approveTx.wait();
        }

        // Send the donation
        // @ts-ignore
        tx = await swapperBridgerContract.sendDonation(
          config.destinationChain,
          config.destinationAddress,
          signer.address,
          0,
          walletAddressInput,
          0,
          inputTokenAddress,
          config.destinationOutputTokenAddress,
          donationAmount,
          {
            gasLimit: 500000,
            value: getNativeToken(parseInt(currentChainId.toString())).axlGas, //TODO: fix this hack one axelar-sdk ethers -> ^6.0.0
          }
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
    const userTokens = await fetchUserERC20Tokens(signer?.address, chainId);

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
          const feeTiers = [3000, 10000, 500, 100];
          for (let j = 0; j < feeTiers.length; j++) {
            const poolAddress = await uniswapV3FactoryContract.getPool(
              stablecoinAddress,
              token.address,
              feeTiers[j]
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

              break;
            }
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

      return userTokens;
    } catch (error) {
      console.error("Failed to fetch user ERC20 tokens:", error);
      return [];
    }
  }

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
              color: modalStyles.headingColor || "#892BE2",
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
                color: modalStyles.headingColor || "#892BE2",
              }}
            >
              &times;
            </button>
          </DialogTitle>

          {showQR ? (
            <div className="flex flex-col items-center p-4">
              <QRCodeSVG value={QRLink} size={256} />
              <Button
                onClick={() => setShowQR(false)}
                className="mt-4"
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
                    {network?.chainId ? (
                      <select
                        className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700 focus:border-purple-500 focus:ring-purple-500"
                        onChange={(e) => chainSelect(parseInt(e.target.value))}
                        defaultValue={parseInt(network.chainId.toString())}
                      >
                        {chainOptions.map((chain) => (
                          <option
                            key={chain.id}
                            value={chain.id}
                            // selected={BigInt(chain.id) === network?.chainId}
                          >
                            {chain.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-700">
                        loading...
                      </div>
                    )}
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
                    {initialized ? (
                      <Button
                        onClick={() => setShowQR(true)}
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
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="space-y-4 flex justify-between">
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
                  {initialized ? (
                    <Button
                      onClick={() => setShowQR(true)}
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
                  ) : null}
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
export type { DooglyDonateProps, Web3Config, DooglyTippingProps };

// Export utility functions for provider setup
export const createCustomProvider = (url: string, chainId: number) => {
  return new ethers.JsonRpcProvider(url, chainId);
};

export const createBrowserProvider = (ethereum: any) => {
  return new ethers.BrowserProvider(ethereum);
};
