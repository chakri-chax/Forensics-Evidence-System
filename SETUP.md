# Police Forensics Evidence Management System

## Setup Instructions

### Prerequisites

1. Node.js and npm installed
2. MetaMask browser extension
3. Pinata account for IPFS storage
4. Ethereum network access (testnet or mainnet)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

Get your Pinata JWT from: https://app.pinata.cloud/developers/api-keys

### Step 3: RUN Hardhat Node

```bash
npx hardhat node
```

Run the Hardhat node in a separate terminal.

### Step 3: Compile Contracts

```bash
npx hardhat compile
```

Compile the smart contracts.

### Step 4: Deploy Contracts

```bash
npx hardhat run .\scripts\caseManagementDeploy.cjs --network localhost
```

### Step 4: Update Contract Address

Edit `src/utils/contractABI.ts` and replace the contract address:

```typescript
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
```

### Step 5: Run Development Server

```bash
npm run dev
```

### Step 6: Build for Production

```bash
npm run build
```

## Usage Guide

### For Admins

1. Connect MetaMask wallet (must be contract owner)
2. Navigate to Admin Dashboard
3. Create new cases
4. Authorize users by wallet address
5. Update case status

### For Authorized Users

1. Connect MetaMask wallet
2. View cases you have access to
3. Upload evidence files to IPFS
4. View evidence timeline

## Security Features

- Wallet-based authentication via MetaMask
- Smart contract access control
- Immutable evidence records on blockchain
- Append-only architecture
- IPFS content addressing for file integrity
- Transparent audit trail

## Tech Stack

- React + TypeScript
- Vite
- TailwindCSS
- ethers.js
- IPFS (Pinata)
- Ethereum Smart Contracts
