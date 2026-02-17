/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { PlusCircle, Users, FileText, Shield, ShieldOff, RefreshCw, Upload, ExternalLink } from "lucide-react";
import { getContract, getReadOnlyContract, formatAddress } from "../utils/ethereum";
import { CaseStatus } from "../types";
const  PINATA_GATEWAY  = import.meta.env.VITE_PINATA_GATEWAY;
import { showToast } from '../components/Toast';
import { toast } from 'react-hot-toast';
import { decodeContractError } from '../utils/contractErrors';
    // Upload file to Pinata
import { uploadToPinata } from "../utils/pinata";
interface AdminDashboardProps {
  onCaseCreated: () => void;
  walletAddress: string;
  hasWriteAccess: boolean;
}
interface AccessInfo {
  address: string;
  hasWriteAccess: boolean;
  hasReadAccess: boolean;
}
interface CaseDetails {
  // Case Details
  caseId: string;
  caseName: string;

  // User Details
  userType: "Examiner" | "Investigator" | "EndUser" | "Others";
  otherUserType: string;
  name: string;
  phone: string;
  email: string;
  orgDeptId: string;
  organizationName: string;
  pointOfContact: string;
  designation: string;
  department: string;

  // Evidence Data
  fileName: string;
  fileType: string;
  ipfsCid: string;
  size: number;
  dateTime: string;
  otherMetadata: string;
}

const AdminDashboard = ({ walletAddress, onCaseCreated, hasWriteAccess }: AdminDashboardProps) => {
  const [caseDetails, setCaseDetails] = useState<CaseDetails>({
    // Case Details
    caseId: "",
    caseName: "",

    // User Details
    userType: "Examiner",
    otherUserType: "",
    name: "",
    phone: "",
    email: "",
    orgDeptId: "",
    organizationName: "",
    pointOfContact: "",
    designation: "",
    department: "",

    // Evidence Data
    fileName: "",
    fileType: "",
    ipfsCid: "",
    size: 0,
    dateTime: "",
    otherMetadata: "WRITE META DATA"
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const [statusCaseId, setStatusCaseId] = useState("");
  const [newStatus, setNewStatus] = useState(CaseStatus.OPEN);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [isUploading, setIsUploading] = useState(false);
const [uploadSuccess, setUploadSuccess] = useState(false);
const [uploadedCID, setUploadedCID] = useState("");

  // // console.log("hasWriteAccess:", hasWriteAccess);
  const [caseName, setCaseName] = useState("");

  const [isOwner, setIsOwner] = useState(false);
  const [accessList, setAccessList] = useState<AccessInfo[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  // Access management states
  const [accessAddress, setAccessAddress] = useState("");
  const [grantWriteAccess, setGrantWriteAccess] = useState(true);
  const [grantReadAccess, setGrantReadAccess] = useState(true);
  const [isGranting, setIsGranting] = useState(false);

  const [revokeAddress, setRevokeAddress] = useState("");
  const [isRevoking, setIsRevoking] = useState(false);


  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCaseDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getUserTypeEnum = (userType: string): number => {
    switch (userType) {
      case "Examiner":
        return 0;
      case "Investigator":
        return 1;
      case "EndUser":
        return 2;
      case "Others":
        return 3;
      default:
        return 0;
    }
  }
  const extractCID = (input: string): string => {
    if (!input) return "";

    input = input.trim();

    // 1️⃣ URL path style: /ipfs/<cid>
    const pathMatch = input.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (pathMatch?.[1]) return pathMatch[1];

    // 2️⃣ Subdomain style: <cid>.ipfs.dweb.link
    const subdomainMatch = input.match(/^https?:\/\/([a-zA-Z0-9]+)\.ipfs\./);
    if (subdomainMatch?.[1]) return subdomainMatch[1];

    // 3️⃣ If already CID
    return input;
  };
  const isValidCID = (cid: string): boolean => {
    if (!cid) return false;

    // CIDv0 (Qm...)
    const cidV0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

    // CIDv1 (bafy..., bafk...)
    const cidV1 = /^b[abcdefghijklmnopqrstuvwxyz234567]{10,}$/;

    return cidV0.test(cid) || cidV1.test(cid);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    const toastId = showToast.loading("Creating case...");

    try {
      const contract = await getContract();

      const userType = getUserTypeEnum(caseDetails.userType);
      const rawCID = caseDetails.ipfsCid;
      const cleanCID = extractCID(rawCID);

      if (!isValidCID(cleanCID)) {
        showToast.dismiss(toastId);
        showToast.error("Invalid IPFS CID format");
        setIsCreating(false);
        return;
      }

      try {
        const tx = await contract.createCase(
          caseDetails.caseId,
          caseDetails.caseName,
          {
            userType: userType,
            otherUserType: caseDetails.otherUserType,
            name: caseDetails.name,
            phone: caseDetails.phone,
            email: caseDetails.email,
            orgDeptId: caseDetails.orgDeptId,
            organizationName: caseDetails.organizationName,
            pointOfContact: caseDetails.pointOfContact,
            designation: caseDetails.designation,
            department: caseDetails.department,
            walletAddress: walletAddress,
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          {
            fileName: caseDetails.fileName,
            fileType: caseDetails.fileType,
            ipfsCID: cleanCID,
            size: caseDetails.size,
            timestamp: Date.now(),
            otherMetadata: caseDetails.otherMetadata,
            submittedBy: walletAddress
          }
        );

        showToast.loading("Waiting for transaction confirmation...");
        const receipt = await tx.wait();

        showToast.dismiss(toastId);

        showToast.success(
          <div>
            <p className="font-semibold">✓ Case Created</p>
            <p className="text-sm text-gray-300">
              Case ID: {caseDetails.caseId}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Block: {receipt.blockNumber}
            </p>
          </div>,
          6000
        );

        // // console.log("Case created successfully with transaction hash:", tx.hash);

      } catch (error: any) {
        showToast.dismiss(toastId);
        console.error("Error creating case:", error);

        const errorMessage = decodeContractError(error);
        showToast.error(errorMessage);
        return;
      }

      setSuccess("Case created successfully!");

      setCaseDetails({
        caseId: "",
        caseName: "",
        userType: "Examiner",
        otherUserType: "",
        name: "",
        phone: "",
        email: "",
        orgDeptId: "",
        organizationName: "",
        pointOfContact: "",
        designation: "",
        department: "",
        fileName: "",
        fileType: "",
        ipfsCid: "",
        size: 0,
        dateTime: "",
        otherMetadata: ""
      });

      onCaseCreated();

    } catch (err: any) {
      showToast.dismiss(toastId);

      const errorMessage = decodeContractError(err);
      showToast.error(errorMessage);

      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };



  const CaseStatusIndex: Record<CaseStatus, number> = {
    [CaseStatus.OPEN]: 0,
    [CaseStatus.INPROGRESS]: 1,
    [CaseStatus.PENDING]: 2,
    [CaseStatus.BLOCKED]: 3,
    [CaseStatus.CLOSED]: 4
  };
  useEffect(() => {
    const checkOwner = async () => {
      try {
        const contract = await getReadOnlyContract();
        const owner = await contract.owner();
        setIsOwner(owner.toLowerCase() === walletAddress.toLowerCase());

        // If owner, load access list
        if (owner.toLowerCase() === walletAddress.toLowerCase()) {
          loadAccessList();
        }
      } catch (err) {
        console.error("Error checking owner:", err);
      }
    };

    if (walletAddress) {
      checkOwner();
    }
  }, [walletAddress]);
  const loadAccessList = async () => {
    setIsLoadingAccess(true);
    setError(null);

    try {
      const contract = await getReadOnlyContract();
      const accessListResult = await contract.getAccessList();

      // Convert the result to an array if it's not already
      const addresses = Array.isArray(accessListResult)
        ? accessListResult
        : [accessListResult];


      // Fetch access details for each address
      const accessInfoList: AccessInfo[] = [];

      for (const address of addresses) {
        if (!address || address === '0x0000000000000000000000000000000000000000') continue;

        try {
          // Check write and read access for each address
          const hasWriteAccess = await contract.hasWriteAccess(address);
          const hasReadAccess = await contract.hasReadAccess(address);

          accessInfoList.push({
            address: address.toString(),
            hasWriteAccess,
            hasReadAccess
          });
        } catch (err) {
          console.error(`Error checking access for ${address}:`, err);
        }
      }
      // // console.log(accessInfoList);
      setAccessList(accessInfoList);
    } catch (err) {
      console.error("Error loading access list:", err);
      setError("Failed to load access list");
    } finally {
      setIsLoadingAccess(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showToast.error("Only the contract owner can grant access");
      return;
    }

    const toastId = showToast.loading("Granting access...");

    try {
      const contract = await getContract();

      if (!/^0x[a-fA-F0-9]{40}$/.test(accessAddress)) {
        showToast.dismiss(toastId);
        showToast.error("Invalid Ethereum address");
        return;
      }

      const tx = await contract.grantAccess(accessAddress, grantWriteAccess, grantReadAccess);

      // Update toast for transaction confirmation
      showToast.loading("Waiting for transaction confirmation...");

      await tx.wait();

      showToast.dismiss(toastId);
      showToast.success(
        `Access granted to ${formatAddress(accessAddress)} with ${grantWriteAccess ? 'write' : 'read-only'
        } access`
      );

      setAccessAddress("");
      setGrantWriteAccess(true);
      setGrantReadAccess(true);
      await loadAccessList();

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Grant access error:", err);

      if (err.message?.includes("CaseManagement__InvalidAddress")) {
        showToast.error("Invalid address provided");
      } else if (err.message?.includes("CaseManagement__CannotModifyOwnerAccess")) {
        showToast.error("Cannot modify owner's access");
      } else if (err.message?.includes("user rejected transaction")) {
        showToast.error("Transaction rejected by user");
      } else {
        showToast.error(err instanceof Error ? err.message : "Failed to grant access");
      }
    }
  };

  // Revoke access from user (Owner only)
  const handleRevokeAccess = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      showToast.error("Only the contract owner can revoke access");
      return;
    }

    setIsRevoking(true);
    setError(null);
    setSuccess(null);

    const toastId = showToast.loading(`Revoking access from ${formatAddress(revokeAddress)}...`);

    try {
      const contract = await getContract();

      // Validate address
      if (!/^0x[a-fA-F0-9]{40}$/.test(revokeAddress)) {
        showToast.dismiss(toastId);
        showToast.error("Invalid Ethereum address format");
        return;
      }

      const tx = await contract.revokeAccess(revokeAddress);

      showToast.loading("Waiting for transaction confirmation...");

      await tx.wait();

      showToast.dismiss(toastId);
      showToast.success(`Access revoked from ${formatAddress(revokeAddress)}`);

      setRevokeAddress("");

      // Refresh access list
      await loadAccessList();

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Revoke access error:", err);

      // Handle specific contract errors
      if (err.message?.includes("CaseManagement__CannotRevokeOwnerAccess")) {
        showToast.error("Cannot revoke owner's access");
      } else if (err.message?.includes("user rejected transaction")) {
        showToast.error("Transaction rejected");
      } else {
        showToast.error(err instanceof Error ? err.message : "Failed to revoke access");
      }
    } finally {
      setIsRevoking(false);
    }
  };
  const handleDirectRevoke = async (addressToRevoke: string) => {
    if (!isOwner) {
      showToast.error("Only the contract owner can revoke access");
      return;
    }

    // Show confirmation toast
    const confirmed = await new Promise((resolve) => {
      toast.custom((t) => (
        <div className="bg-police-blue-dark p-4 rounded-lg border border-police-red shadow-lg">
          <h3 className="text-white font-bold mb-2">Confirm Revoke Access</h3>
          <p className="text-gray-300 text-sm mb-4">
            Are you sure you want to revoke access from{' '}
            <span className="text-police-red font-mono">{formatAddress(addressToRevoke)}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="flex-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });

    if (!confirmed) return;

    const toastId = showToast.loading(`Revoking access from ${formatAddress(addressToRevoke)}...`);

    try {
      const contract = await getContract();
      const tx = await contract.revokeAccess(addressToRevoke);

      showToast.loading("Waiting for transaction confirmation...");
      await tx.wait();

      showToast.dismiss(toastId);
      showToast.success(`Access revoked from ${formatAddress(addressToRevoke)}`);

      await loadAccessList();

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Revoke error:", err);

      if (err.message?.includes("CaseManagement__CannotRevokeOwnerAccess")) {
        showToast.error("Cannot revoke owner's access");
      } else {
        showToast.error(err instanceof Error ? err.message : "Failed to revoke access");
      }
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!statusCaseId.trim()) {
      showToast.error("Please enter a Case ID");
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);
    setSuccess(null);

    const statusIndex = CaseStatusIndex[newStatus];
    const toastId = showToast.loading(`Updating case #${statusCaseId} status to ${newStatus}...`);

    try {
      const contract = await getContract();

      const getCaseByExternalId = await contract.getCaseByExternalId(statusCaseId);

      if (!getCaseByExternalId || !getCaseByExternalId.id) {
        showToast.dismiss(toastId);
        showToast.error(`Case with ID "${statusCaseId}" not found`);
        return;
      }

      const tx = await contract.updateCaseStatus(getCaseByExternalId.id, statusIndex);

      showToast.loading("Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      showToast.dismiss(toastId);
      showToast.success(
        <div>
          <p className="font-semibold">✓ Status Updated</p>
          <p className="text-sm text-gray-300">Case #{statusCaseId} is now {newStatus}</p>
          <p className="text-xs text-gray-400 mt-1">
            Block: {receipt.blockNumber}
          </p>
        </div>,
        6000
      );

      setStatusCaseId("");
      setNewStatus(CaseStatus.OPEN);

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Error updating case status:", err);

      // Decode the contract error
      const errorMessage = decodeContractError(err);
      showToast.error(errorMessage);

    } finally {
      setIsUpdatingStatus(false);
    }
  };
  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwner) {
      showToast.error("Only the current owner can transfer ownership");
      return;
    }

    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(newOwnerAddress)) {
      showToast.error("Invalid Ethereum address format");
      return;
    }

    // Check if trying to transfer to self
    if (newOwnerAddress.toLowerCase() === walletAddress.toLowerCase()) {
      showToast.error("New owner address must be different from current owner");
      return;
    }

    // Show double confirmation with a custom toast
    const confirmed = await new Promise((resolve) => {
      toast.custom((t) => (
        <div className="bg-police-blue-dark p-4 rounded-lg border border-yellow-600 shadow-xl max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-6 h-6 text-yellow-600" />
            <h3 className="text-white font-bold text-lg">Confirm Ownership Transfer</h3>
          </div>

          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 p-3 rounded mb-4">
            <p className="text-sm text-yellow-200 font-semibold mb-2">⚠️ Final Warning</p>
            <p className="text-sm text-gray-300">
              You are about to transfer contract ownership to:
            </p>
            <p className="text-police-red font-mono text-sm bg-police-blue p-2 rounded mt-2 break-all">
              {newOwnerAddress}
            </p>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            This action will:
          </p>
          <ul className="text-xs text-gray-400 list-disc list-inside mb-4 space-y-1">
            <li>Transfer all owner privileges to the new address</li>
            <li>Remove your owner access permanently</li>
            <li>Allow the new owner to manage access control</li>
            <li>Be recorded on the blockchain permanently</li>
          </ul>

          <div className="flex gap-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-semibold transition-colors"
            >
              Yes, Transfer Ownership
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });

    if (!confirmed) {
      showToast.info("Ownership transfer cancelled");
      return;
    }

    setIsTransferring(true);
    setError(null);
    setSuccess(null);

    const toastId = showToast.loading(`Transferring ownership to ${formatAddress(newOwnerAddress)}...`);

    try {
      const contract = await getContract();

      const tx = await contract.changeOwner(newOwnerAddress);

      showToast.loading("Waiting for transaction confirmation...");

      const receipt = await tx.wait();

      showToast.dismiss(toastId);

      showToast.success(
        <div>
          <p className="font-semibold">✓ Ownership Transferred Successfully!</p>
          <p className="text-sm text-gray-300 mt-1">
            New owner: {formatAddress(newOwnerAddress)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Tx: {receipt.hash.substring(0, 10)}...{receipt.hash.substring(receipt.hash.length - 8)}
          </p>
          <p className="text-xs text-yellow-400 mt-2">
            ⚠️ You are no longer the contract owner
          </p>
        </div>,
        10000 // Show for 10 seconds
      );

      // Reset form
      setNewOwnerAddress("");
      setConfirmTransfer(false);

      // Refresh owner status (you might need to update your isOwner check)
      // You could trigger a re-check or reload the page
      setTimeout(() => {
        window.location.reload(); // Simple reload to update owner status
      }, 3000);

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Error transferring ownership:", err);

      // Handle specific errors
      if (err.message?.includes("user rejected transaction")) {
        showToast.error("Transaction rejected in wallet");
      } else if (err.message?.includes("CaseManagement__OnlyOwner")) {
        showToast.error("Only the owner can call this function");
      } else {
        // Use your contract error decoder
        const errorMessage = decodeContractError(err);
        showToast.error(errorMessage);
      }

    } finally {
      setIsTransferring(false);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setSelectedFile(file);
    setError(null);
    setUploadSuccess(false);
    
    // Auto-fill form fields
    setCaseDetails(prev => ({
      ...prev,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      size: file.size,
      dateTime: new Date().toISOString().slice(0, 16) // Format for datetime-local
    }));
  }
};

const handleFileUpload = async () => {
  if (!selectedFile) return;

  setIsUploading(true);
  setError(null);
  setUploadSuccess(false);

  const toastId = showToast.loading("Uploading file to IPFS via Pinata...");

  try {
    const cid = await uploadToPinata(selectedFile);
    
    showToast.dismiss(toastId);
    showToast.success(`File uploaded successfully! CID: ${cid}`);
    
    // Update form with CID
    setCaseDetails(prev => ({
      ...prev,
      ipfsCid: cid,
      otherMetadata: JSON.stringify({
        originalName: selectedFile.name,
        lastModified: selectedFile.lastModified,
        uploadedAt: new Date().toISOString(),
        fileSize: selectedFile.size,
        mimeType: selectedFile.type
      }, null, 2)
    }));
    
    setUploadedCID(cid);
    setUploadSuccess(true);
    
  } catch (err: any) {
    showToast.dismiss(toastId);
    console.error("Upload error:", err);
    
    const errorMessage = err.message || "Failed to upload file to IPFS";
    showToast.error(errorMessage);
    setError(errorMessage);
    
  } finally {
    setIsUploading(false);
  }
};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage cases, users, and system operations</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-900 border border-green-700 text-green-200 px-4 py-3">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Case Form - Enhanced with all fields */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-police-red-accent p-2">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Create New Case</h2>
          </div>

          <form onSubmit={handleCreateCase} className="space-y-6">
            {/* Case Details Section */}
            <div className="border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Case Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Case ID
                  </label>
                  <input
                    type="text"
                    name="caseId"
                    value={caseDetails.caseId}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter case ID..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Case Name
                  </label>
                  <input
                    type="text"
                    name="caseName"
                    value={caseDetails.caseName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter case name..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* User Details Section */}
            <div className="border border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">User Details</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Select User Type
                </label>
                <div className="space-y-2">
                  {["Examiner", "Investigator", "EndUser", "Others"].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="userType"
                        value={type}
                        checked={caseDetails.userType === type}
                        onChange={handleInputChange}
                        className="form-radio text-police-red"
                      />
                      <span className="text-white">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {caseDetails.userType === "Others" && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Specify Other User Type
                  </label>
                  <input
                    type="text"
                    name="otherUserType"
                    value={caseDetails.otherUserType}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Specify user type..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={caseDetails.name}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter name..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={caseDetails.phone}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter phone number..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={caseDetails.email}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter email..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Org / Dept ID
                  </label>
                  <input
                    type="text"
                    name="orgDeptId"
                    value={caseDetails.orgDeptId}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter organization/department ID..."
                  />
                </div>
              </div>

              <h4 className="text-md font-semibold text-white mt-4 mb-3">Organization Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={caseDetails.organizationName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter organization name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Point of Contact
                  </label>
                  <input
                    type="text"
                    name="pointOfContact"
                    value={caseDetails.pointOfContact}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter point of contact..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={caseDetails.designation}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter designation..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={caseDetails.department}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter department..."
                  />
                </div>
              </div>
            </div>

            {/* Evidence Data Section */}
            {/* Evidence Data Section */}
            <div className="border border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-police-red-accent p-2">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Upload Evidence</h3>
              </div>

              {/* File Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Select File to Upload
                </label>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileSelect}
                  className="input-field"
                  accept="*/*"
                />

                {/* File Preview */}
                {selectedFile && (
                  <div className="mt-4 bg-police-blue-dark p-4 rounded border border-gray-700">
                    <h4 className="text-sm font-semibold text-white mb-3">File Details</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">File Name</p>
                        <p className="text-white">{selectedFile.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">File Type</p>
                        <p className="text-white">{selectedFile.type || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Size</p>
                        <p className="text-white">{(selectedFile.size / 1024).toFixed(2)} KB ({selectedFile.size} bytes)</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Last Modified</p>
                        <p className="text-white">{new Date(selectedFile.lastModified).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Upload Button (only shows when file is selected) */}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={isUploading || !selectedFile}
                        className="btn-primary bg-police-red hover:bg-police-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload to IPFS
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Progress/Status */}
                {isUploading && (
                  <div className="mt-4 bg-police-blue-dark p-3 rounded border border-police-red">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-police-red"></div>
                      <div>
                        <p className="text-sm text-white">Uploading to IPFS via Pinata...</p>
                        <p className="text-xs text-gray-400">Please wait while your file is being uploaded</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Success Message */}
                {uploadSuccess && (
                  <div className="mt-4 bg-green-900 bg-opacity-20 border border-green-700 p-3 rounded">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-900 p-1 rounded-full">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-green-500 font-semibold">Upload Successful!</p>
                        <p className="text-xs text-gray-400">IPFS CID: {uploadedCID}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadSuccess(false)}
                        className="ml-auto text-gray-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Entry Fields (pre-filled after upload) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    File Name
                  </label>
                  <input
                    type="text"
                    name="fileName"
                    value={caseDetails.fileName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Auto-filled after upload"
                    readOnly={!!selectedFile}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    File Type
                  </label>
                  <input
                    type="text"
                    name="fileType"
                    value={caseDetails.fileType}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Auto-filled after upload"
                    readOnly={!!selectedFile}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    IPFS CID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="ipfsCid"
                      value={caseDetails.ipfsCid}
                      onChange={handleInputChange}
                      className="input-field flex-1"
                      placeholder="Auto-filled after upload"
                      readOnly={!!uploadedCID}
                    />
                    {caseDetails.ipfsCid && (
                      <a
                        href={`https://${PINATA_GATEWAY}/ipfs/${caseDetails.ipfsCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-police-blue p-2 rounded hover:bg-police-blue-light transition-colors"
                        title="View on IPFS"
                      >
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Size (in bytes)
                  </label>
                  <input
                    type="number"
                    name="size"
                    value={caseDetails.size}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Auto-filled after upload"
                    readOnly={!!selectedFile}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="dateTime"
                    value={caseDetails.dateTime}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Other Metadata
                  </label>
                  <textarea
                    name="otherMetadata"
                    value={caseDetails.otherMetadata}
                    onChange={handleInputChange}
                    className="input-field min-h-[100px]"
                    placeholder="Enter additional metadata..."
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating Case..." : "Submit Case"}
            </button>
          </form>
        </div>

        {isOwner && (
          <div className="card border-2 border-police-red">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-police-red p-2">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Grant Access (Owner Only)</h2>
            </div>
            <form onSubmit={handleGrantAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  User Wallet Address
                </label>
                <input
                  type="text"
                  value={accessAddress}
                  onChange={(e) => setAccessAddress(e.target.value)}
                  className="input-field font-mono"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Please enter a valid Ethereum address (0x followed by 40 hex characters)"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Access Level
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grantWriteAccess}
                      onChange={(e) => setGrantWriteAccess(e.target.checked)}
                      className="form-checkbox text-police-red rounded"
                    />
                    <span className="text-white">Write Access</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={grantReadAccess}
                      onChange={(e) => setGrantReadAccess(e.target.checked)}
                      className="form-checkbox text-police-red rounded"
                    />
                    <span className="text-white">Read Access</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Write access includes read access automatically
                </p>
              </div>

              <button
                type="submit"
                disabled={isGranting || !accessAddress}
                className="btn-primary w-full bg-police-red hover:bg-police-red-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGranting ? "Granting Access..." : "Grant Access"}
              </button>
            </form>
          </div>
        )}

        {/* Revoke Access Form - Only visible to owner */}
        {isOwner && (
          <div className="card border-2 border-red-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-900 p-2">
                <ShieldOff className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Revoke Access (Owner Only)</h2>
            </div>
            <form onSubmit={handleRevokeAccess} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  User Wallet Address
                </label>
                <input
                  type="text"
                  value={revokeAddress}
                  onChange={(e) => setRevokeAddress(e.target.value)}
                  className="input-field font-mono"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Please enter a valid Ethereum address"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRevoking || !revokeAddress}
                className="btn-primary w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? "Revoking Access..." : "Revoke All Access"}
              </button>
            </form>
          </div>
        )}


        {/* Update Case Status Form */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-police-red-accent p-2">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Update Case Status</h2>
          </div>
          <form onSubmit={handleUpdateStatus} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Case ID
              </label>
              <input
                type="text"
                value={statusCaseId}
                onChange={(e) => setStatusCaseId(e.target.value)}
                className="input-field"
                placeholder="Enter case ID..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as unknown as CaseStatus)}
                className="input-field"
              >
                {Object.values(CaseStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingStatus ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>
        {isOwner && (
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-police-red-accent p-2">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Users with Access</h2>
              </div>
              <button
                onClick={loadAccessList}
                disabled={isLoadingAccess}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isLoadingAccess ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingAccess ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-police-red mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading access list...</p>
              </div>
            ) : accessList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No additional users with access</p>
            ) : (
              <div className="space-y-2">
                {accessList.map((access, index) => (
                  <div
                    key={access.address}
                    className="bg-police-blue-dark p-3 rounded flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-mono text-sm">{formatAddress(access.address)}</p>
                      <div className="flex gap-2 mt-1">
                        {access.hasWriteAccess && (
                          <span className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded">
                            Write
                          </span>
                        )}
                        {access.hasReadAccess && !access.hasWriteAccess && (
                          <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDirectRevoke(access.address)}
                      disabled={isRevoking}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isRevoking ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                          Revoking...
                        </>
                      ) : (
                        'Revoke'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Transfer Ownership - Only visible to owner */}
        {isOwner && (
          <div className="card lg:col-span-2 bg-police-blue-dark border border-yellow-600 rounded-xl shadow-lg">

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-yellow-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Transfer Ownership
                </h2>
                <p className="text-xs text-gray-400">
                  Current Owner: {formatAddress(walletAddress)}
                </p>
              </div>
            </div>

            {/* Warning Box */}
            <div className="mb-6 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <p className="text-sm text-yellow-200 leading-relaxed">
                ⚠️ Warning: This action will transfer contract ownership to another address.
                The new owner will have full control over the contract, including access management.
                This action is irreversible.
              </p>
            </div>

            <form onSubmit={handleTransferOwnership} className="space-y-5">

              {/* New Owner Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  New Owner Wallet Address
                </label>

                <input
                  type="text"
                  value={newOwnerAddress}
                  onChange={(e) => setNewOwnerAddress(e.target.value)}
                  className="input-field font-mono rounded-lg"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Please enter a valid Ethereum address"
                  required
                />

                <p className="text-xs text-gray-500 mt-1">
                  Current owner: {formatAddress(walletAddress)}
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-3 bg-police-blue-light/20 p-3 rounded-lg border border-gray-700">
                <input
                  type="checkbox"
                  id="confirmTransfer"
                  checked={confirmTransfer}
                  onChange={(e) => setConfirmTransfer(e.target.checked)}
                  className="mt-1 form-checkbox text-yellow-600 rounded"
                />
                <label
                  htmlFor="confirmTransfer"
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  I understand that this will permanently transfer ownership and I will
                  lose owner privileges after this transaction.
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isTransferring || !newOwnerAddress || !confirmTransfer}
                className="w-full py-3 rounded-lg font-semibold transition-all duration-200
                   bg-yellow-600 hover:bg-yellow-700
                   disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransferring
                  ? "Transferring Ownership..."
                  : "Transfer Ownership"}
              </button>
            </form>
          </div>
        )}

        {/* Non-owner message */}
        {!isOwner && (
          <div className="card lg:col-span-2 bg-police-blue-dark border border-police-red">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-police-red-accent p-2">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Access Management</h2>
            </div>
            <p className="text-gray-300">
              You are connected as a non-owner user. Only the contract owner can manage
              access permissions. If you need access to manage cases, please contact the
              contract owner.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;