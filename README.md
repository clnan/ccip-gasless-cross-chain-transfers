# 🚀 Gasless Cross-Chain Transfers with Chainlink CCIP

A Next.js application demonstrating gasless cross-chain token transfers from Arbitrum Sepolia to Base Sepolia using **Chainlink CCIP** and **Alchemy's Account Abstraction**.

![Chainlink CCIP](https://img.shields.io/badge/Chainlink-CCIP-375BD2?style=for-the-badge&logo=chainlink)
![Alchemy](https://img.shields.io/badge/Alchemy-Account%20Abstraction-2196F3?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)

## ✨ Features

- **🔗 Cross-Chain Transfers**: Send USDC from Arbitrum Sepolia to Base Sepolia
- **⛽ Zero Gas Fees**: Users pay no transaction fees thanks to Account Abstraction
- **🔐 Account Abstraction**: Powered by Alchemy's AA infrastructure
- **🌐 Chainlink CCIP**: Industry-standard cross-chain interoperability protocol
- **🔍 Transaction Tracking**: Direct links to CCIP Explorer for monitoring transfers

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Arbitrum Sepolia (source), Base Sepolia (destination)
- **Cross-Chain**: Chainlink CCIP (Cross-Chain Interoperability Protocol)
- **Account Abstraction**: Alchemy Account Kit
- **Smart Contract Interaction**: Viem, Account Kit React hooks

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (required by `@chainlink/ccip-sdk`; 24+ recommended)
- Git
- An Alchemy API key
- Test tokens on Arbitrum Sepolia

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/clnan/ccip-gasless-cross-chain-transfers.git
   cd ccip-gasless-cross-chain-transfers
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
   NEXT_PUBLIC_ALCHEMY_POLICY_ID=your_gas_sponsorship_policy_id_here
   NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 How It Works

### The Transfer Process

1. **Connect Wallet**: Users connect their wallet and land on Arbitrum Sepolia
2. **Select Token**: Choose between USDC or CCIP-BnM test tokens
3. **Enter Details**: Specify amount and destination address on Base Sepolia
4. **Approve Tokens**: Smart contract approves tokens for CCIP router (if needed)
5. **CCIP Transfer**: Chainlink CCIP handles the cross-chain message and token transfer
6. **Track Progress**: Monitor the transfer on CCIP Explorer

### Key Components

- **CCIP Router**: `0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165` (Arbitrum Sepolia)
- **Destination Chain**: Base Sepolia (Chain Selector: `10344971235874465080`)
- **Supported Tokens**: 
  - USDC: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
  - CCIP-BnM: `0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D`

## 🎨 UI Features

### Dual-Brand Design
- **Chainlink CCIP**: Official CCIP logo and blue color scheme (#375BD2)
- **Alchemy**: Account Abstraction branding and blue gradients (#2196F3)
- **Modern Interface**: Clean cards, gradients, and smooth animations

### User Experience
- **Real-time Status**: Shows current processing step (checking, approving, transferring)
- **Error Handling**: Clear error messages and retry functionality
- **Success Tracking**: Direct links to CCIP Explorer for transaction monitoring
- **Responsive Design**: Works on desktop and mobile devices

## 🔗 Smart Contract Integration

### CCIP SDK Integration

All CCIP logic lives in `lib/ccip/` and uses the official [CCIP SDK](https://docs.chain.link/ccip/tools/sdk/) (`@chainlink/ccip-sdk`) and [CCIP API v2](https://docs.chain.link/ccip/tools/api/):

| File | Purpose |
|------|---------|
| `config.ts` | Lane config: router, chain selectors (from the SDK's network registry), tokens |
| `transfer.ts` | Wallet-agnostic helpers: `quoteFee`, `buildTransferCalls`, `getMessageIds` |
| `useCCIPTransfer.ts` | React hook: balance check → SDK-built calls → one sponsored batch |
| `useMessageStatus.ts` | Polls the CCIP API for message status until delivered or failed |
| `sdk.ts` | EVM-only SDK imports (keeps non-EVM chain code out of the browser bundle) |

`buildTransferCalls` uses the SDK's `generateUnsignedSendMessage`, which returns any needed ERC-20
approvals followed by `ccipSend` as plain `{to, data, value}` calls. These are sent as **one batched,
gas-sponsored transaction** from the smart account. `extraArgs` are left to the SDK, which picks the
right encoding for the lane (including `GenericExtraArgsV3` on CCIP 2.0 lanes).

### Account Abstraction Flow
1. User initiates transfer (no direct wallet interaction)
2. Smart account batches the token approval (if needed) and the CCIP send into one operation
3. All gas fees sponsored by the application's Alchemy policy
4. **Note:** the CCIP protocol fee is paid in native ETH from the smart account, so the account
   needs a small Arbitrum Sepolia ETH balance. Gas sponsorship doesn't cover the CCIP fee.

## 🌐 Supported Networks

| Network | Chain ID | Purpose | Status |
|---------|----------|---------|--------|
| Arbitrum Sepolia | 421614 | Source Chain | ✅ Active |
| Base Sepolia | 84532 | Destination Chain | ✅ Active |

## 📊 Monitoring & Analytics

### CCIP Explorer Integration
- **Direct Links**: Links to the CCIP message (by message ID) on CCIP Explorer
- **Real-time Status**: In-app status from the CCIP API (sent → verified → delivered)
- **Transfer Time**: Typically 10-20 minutes for completion

### Transaction Flow
1. **Source Transaction**: Token approval and CCIP send on Arbitrum Sepolia
2. **CCIP Processing**: Chainlink network validates and processes message
3. **Destination Delivery**: Tokens arrive on Base Sepolia

## 🛡 Security Features

- **Account Abstraction**: No private key exposure
- **Chainlink CCIP**: Battle-tested cross-chain infrastructure
- **Token Approvals**: Minimal approval amounts for security
- **Error Recovery**: Comprehensive error handling and user feedback

## 🔮 Future Enhancements

- [ ] Additional token support (ETH, other ERC-20s)
- [ ] More destination chains (Polygon, Optimism, etc.)
- [ ] Transaction history and portfolio tracking
- [ ] Advanced CCIP features (arbitrary messaging, NFT transfers)
- [ ] Gasless transactions on destination chain

## 📚 Resources

- [Chainlink CCIP Documentation](https://docs.chain.link/ccip)
- [Alchemy Account Kit](https://accountkit.alchemy.com/)
- [CCIP Explorer](https://ccip.chain.link/)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Base Sepolia Faucet](https://faucet.quicknode.com/base/sepolia)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

