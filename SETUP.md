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
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

Get your Pinata JWT from: https://app.pinata.cloud/developers/api-keys

### Step 3: Deploy Smart Contract

Deploy the EvidenceManagement smart contract to your desired Ethereum network.

Smart Contract Code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceManagement {
    address public owner;
    uint256 public caseCount;

    struct Case {
        uint256 caseId;
        string caseName;
        string status;
        address owner;
        uint256 timestamp;
        string[] evidence;
    }

    mapping(uint256 => Case) public cases;
    mapping(uint256 => mapping(address => bool)) public authorizedUsers;
    mapping(uint256 => address[]) private authorizedUsersList;

    event CaseCreated(uint256 indexed caseId, string caseName, address owner);
    event EvidenceAdded(uint256 indexed caseId, string cid, address uploader);
    event UserAuthorized(uint256 indexed caseId, address user);
    event UserRevoked(uint256 indexed caseId, address user);
    event CaseStatusUpdated(uint256 indexed caseId, string newStatus);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyCaseOwner(uint256 _caseId) {
        require(msg.sender == cases[_caseId].owner, "Only case owner can perform this action");
        _;
    }

    modifier onlyAuthorized(uint256 _caseId) {
        require(authorizedUsers[_caseId][msg.sender], "Not authorized to access this case");
        _;
    }

    function createCase(string memory _caseName) public onlyOwner {
        caseCount++;
        cases[caseCount] = Case({
            caseId: caseCount,
            caseName: _caseName,
            status: "Open",
            owner: msg.sender,
            timestamp: block.timestamp,
            evidence: new string[](0)
        });

        authorizedUsers[caseCount][msg.sender] = true;
        authorizedUsersList[caseCount].push(msg.sender);

        emit CaseCreated(caseCount, _caseName, msg.sender);
    }

    function authorizeUser(uint256 _caseId, address _user) public onlyCaseOwner(_caseId) {
        require(!authorizedUsers[_caseId][_user], "User already authorized");
        authorizedUsers[_caseId][_user] = true;
        authorizedUsersList[_caseId].push(_user);

        emit UserAuthorized(_caseId, _user);
    }

    function revokeUser(uint256 _caseId, address _user) public onlyCaseOwner(_caseId) {
        require(authorizedUsers[_caseId][_user], "User not authorized");
        authorizedUsers[_caseId][_user] = false;

        emit UserRevoked(_caseId, _user);
    }

    function addEvidence(uint256 _caseId, string memory _cid) public onlyAuthorized(_caseId) {
        cases[_caseId].evidence.push(_cid);

        emit EvidenceAdded(_caseId, _cid, msg.sender);
    }

    function updateCaseStatus(uint256 _caseId, string memory _newStatus) public onlyCaseOwner(_caseId) {
        cases[_caseId].status = _newStatus;

        emit CaseStatusUpdated(_caseId, _newStatus);
    }

    function getCase(uint256 _caseId) public view onlyAuthorized(_caseId) returns (
        uint256,
        string memory,
        string memory,
        address,
        uint256,
        string[] memory
    ) {
        Case memory c = cases[_caseId];
        return (c.caseId, c.caseName, c.status, c.owner, c.timestamp, c.evidence);
    }

    function getCaseEvidence(uint256 _caseId) public view onlyAuthorized(_caseId) returns (string[] memory) {
        return cases[_caseId].evidence;
    }

    function isAuthorized(uint256 _caseId, address _user) public view returns (bool) {
        return authorizedUsers[_caseId][_user];
    }

    function getAuthorizedUsers(uint256 _caseId) public view onlyAuthorized(_caseId) returns (address[] memory) {
        return authorizedUsersList[_caseId];
    }
}
```

### Step 4: Update Contract Address

Edit `src/utils/contractABI.ts` and replace the contract address:

```typescript
export const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
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
