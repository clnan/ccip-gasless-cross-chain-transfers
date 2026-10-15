// EVM-only entry points into @chainlink/ccip-sdk.
// The package root re-exports every chain family (Aptos, Solana, Sui, TON, Canton), and some of
// their Node-only dependencies break the Next.js client bundle. Importing the EVM modules directly
// keeps the bundle small and browser-safe. Route all SDK imports through this file.
export { EVMChain } from "@chainlink/ccip-sdk/dist/evm/index.js";
export { fromViemClient } from "@chainlink/ccip-sdk/dist/evm/viem/index.js";
export { CCIPAPIClient } from "@chainlink/ccip-sdk/dist/api/index.js";
export { networkInfo } from "@chainlink/ccip-sdk/dist/networks.js";
export { getCCIPExplorerUrl } from "@chainlink/ccip-sdk/dist/explorer.js";
export { MessageStatus } from "@chainlink/ccip-sdk/dist/types.js";
