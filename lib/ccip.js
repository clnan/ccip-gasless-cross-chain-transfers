// lib/ccip.js
export const CCIP_CONFIG = {
  // Testnets
  sepolia: {
    chainId: 11155111,
    router: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    chainSelector: "16015286601757825753",
    linkToken: "0x779877A7B0D9E8603169DdbD7836e478b4624789"
  },
  mumbai: {
    chainId: 80001,
    router: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
    chainSelector: "12532609583862916517",
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB"
  },
  avalancheFuji: {
    chainId: 43113,
    router: "0xF694E193200268f9a4868e4Aa017A0118C9a8177",
    chainSelector: "14767482510784806043",
    linkToken: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846"
  }
};

export const CCIP_ROUTER_ABI = [
  "function getSupportedTokens(uint64 destinationChainSelector) external view returns (address[])",
  "function getFee(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) external view returns (uint256)",
  "function ccipSend(uint64 destinationChainSelector, tuple(bytes receiver, bytes data, tuple(address token, uint256 amount)[] tokenAmounts, address feeToken, bytes extraArgs) message) external payable returns (bytes32)"
];