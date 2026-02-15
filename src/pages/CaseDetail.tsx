/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
const { PINATA_GATEWAY } = import.meta.env.VITE_PINATA_GATEWAY || "gateway.pinata.cloud";
import { showToast } from '../components/Toast';
import { decodeContractError } from '../utils/contractErrors';
import { getProvider } from '../utils/ethereum';
import {
  ArrowLeft,
  Upload,
  Info,
  Users,
  Building2,
  Mail,
  Phone,
  Calendar,
  User,
  FileText,
  Tag,
  Hash,
  Clock
} from "lucide-react";
import { Case, UserDetails, Evidence, CaseStatus, UserType } from "../types";
import { getContract, getReadOnlyContract, formatAddress } from "../utils/ethereum";
import { uploadToPinata } from "../utils/pinata";
import StatusBadge from "../components/StatusBadge";
import EvidenceTimeline from "../components/EvidenceTimeline";
import LoadingSpinner from "../components/LoadingSpinner";

interface CaseDetailProps {
  caseId: number;
  onBack: () => void;
  walletAddress: string;
}

// User type mapping for display
const userTypeMap: { [key: number]: string } = {
  0: "Examiner",
  1: "Investigator",
  2: "End User",
  3: "Other"
};

// Status mapping for display
const statusMap: { [key: number]: string } = {
  0: "OPEN",
  1: "IN PROGRESS",
  2: "PENDING",
  3: "BLOCKED",
  4: "CLOSED"
};

interface EvidenceFormData {
  fileName: string;
  fileType: string;
  ipfsCID: string;
  size: number;
  otherMetadata: string;
}

const CaseDetail = ({ caseId, onBack, walletAddress }: CaseDetailProps) => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const [hasReadAccess, setHasReadAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'details'>('overview');
  const [evidencePage, setEvidencePage] = useState(0);
  const [totalEvidence, setTotalEvidence] = useState(0);
  const evidencePerPage = 5;

  const loadCaseData = async () => {
    setIsLoading(false);
    setError(null);

    try {


      let contract = await getReadOnlyContract();

      const provider = getProvider();
      // Ensure contract is connected to signer
      const signer = await provider.getSigner();
      contract = contract.connect(signer);



      // Check access permissions
      const writeAccess = await contract.hasWriteAccess(walletAddress);
      const readAccess = await contract.hasReadAccess(walletAddress);
      setHasWriteAccess(writeAccess);
      setHasReadAccess(readAccess);

      if (!readAccess && !writeAccess) {
        setError("You don't have access to view this case");
        setIsLoading(false);
        return;
      }
      // Get case details
      const data = await contract.getCase(caseId);
      // Get evidence with pagination
      const evidence = await contract.getCaseEvidence(caseId, evidencePage * evidencePerPage, evidencePerPage);

      // Transform contract data to frontend Case type
      const transformedCase: Case = {
        caseId: Number(data.id),
        caseExternalId: data.caseId,
        caseName: data.caseName,
        status: data.status,
        statusText: statusMap[data.status],
        owner: data.createdBy,
        createdBy: data.createdBy,
        timestamp: Number(data.createdAt),
        createdAt: Number(data.createdAt),
        lastUpdated: Number(data.updatedAt),
        evidence: evidence.map((e: any) => ({
          fileName: e.fileName,
          fileType: e.fileType,
          ipfsCID: e.ipfsCID,
          size: Number(e.size),
          timestamp: Number(e.timestamp),
          otherMetadata: e.otherMetadata,
          submittedBy: e.submittedBy
        })),
        evidenceCount: data.evidence?.length || 0,
        authorizedUsers: [], // This would need a separate call if needed
        isActive: data.isActive,

        // User details
        userDetails: {
          userType: Number(data.userDetails.userType),
          otherUserType: data.userDetails.otherUserType,
          name: data.userDetails.name,
          phone: data.userDetails.phone,
          email: data.userDetails.email,
          orgDeptId: data.userDetails.orgDeptId,
          organizationName: data.userDetails.organizationName,
          pointOfContact: data.userDetails.pointOfContact,
          designation: data.userDetails.designation,
          department: data.userDetails.department,
          walletAddress: data.userDetails.walletAddress,
          createdAt: Number(data.userDetails.createdAt),
          updatedAt: Number(data.userDetails.updatedAt)
        },

        // Derived fields
        organization: data.userDetails.organizationName,
        contactPerson: data.userDetails.name,
        submittedBy: data.createdBy,
        userType: userTypeMap[Number(data.userDetails.userType)] || "Unknown",
        userTypeValue: Number(data.userDetails.userType)
      };

      setTotalEvidence(data.evidence?.length || 0);
      setCaseData(transformedCase);

    } catch (err) {
      console.error("Error loading case:", err);
      setError(err instanceof Error ? err.message : "Failed to load case");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (caseId && walletAddress) {
      loadCaseData();
    }
  }, [caseId, walletAddress, evidencePage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !caseData) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const toastId = showToast.loading("Uploading file to IPFS...");

    try {
      // 🔹 Upload file to Pinata
      const cid = await uploadToPinata(selectedFile);

      showToast.loading("File uploaded. Preparing blockchain transaction...");

      const evidenceData = {
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/octet-stream',
        ipfsCID: cid,
        size: selectedFile.size,
        timestamp: Date.now(),
        otherMetadata: JSON.stringify({
          originalName: selectedFile.name,
          lastModified: selectedFile.lastModified,
          uploadedAt: new Date().toISOString()
        }),
        submittedBy: walletAddress
      };

      // 🔹 Add evidence to blockchain
      const contract = await getContract();
      const tx = await contract.addEvidence(caseId, evidenceData);

      showToast.loading("Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      showToast.dismiss(toastId);

      showToast.success(
        <div>
          <p className="font-semibold">✓ Evidence Uploaded</p>
          <p className="text-sm text-gray-300">
            File: {selectedFile.name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Block: {receipt.blockNumber}
          </p>
        </div>,
        6000
      );

      setSuccess("Evidence uploaded successfully!");
      setSelectedFile(null);

      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await loadCaseData();

    } catch (err: any) {
      showToast.dismiss(toastId);
      console.error("Upload error:", err);

      const errorMessage = decodeContractError(err);
      showToast.error(errorMessage);

      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };


  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16 bg-police-blue rounded-lg">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Case Not Found</h3>
          <p className="text-gray-400 mb-6">The case you're looking for doesn't exist or you don't have access.</p>
          <button onClick={onBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cases
        </button>

        {caseData.isActive === false && (
          <span className="bg-red-900 text-red-200 px-3 py-1 text-sm font-semibold">
            Case Deactivated
          </span>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'overview'
              ? 'text-police-red border-b-2 border-police-red'
              : 'text-gray-400 hover:text-white'
            }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'evidence'
              ? 'text-police-red border-b-2 border-police-red'
              : 'text-gray-400 hover:text-white'
            }`}
        >
          Evidence ({totalEvidence})
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'details'
              ? 'text-police-red border-b-2 border-police-red'
              : 'text-gray-400 hover:text-white'
            }`}
        >
          User Details
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Case Header */}
              <div className="card">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{caseData.caseName}</h1>
                    <div className="flex items-center gap-4">
                      <p className="text-gray-400">Case #{caseData.caseId}</p>
                      {caseData.caseExternalId && (
                        <p className="text-gray-400">Ref: {caseData.caseExternalId}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={caseData.status} text={caseData.statusText} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Owner</p>
                    <p className="text-white font-mono text-sm">{formatAddress(caseData.owner)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Created</p>
                    <p className="text-white text-sm">{formatDate(caseData.createdAt || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                    <p className="text-white text-sm">{formatDate(caseData.lastUpdated || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Evidence</p>
                    <p className="text-white text-sm font-bold">{totalEvidence}</p>
                  </div>
                </div>
              </div>

              {/* Organization Info */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-police-red-accent p-2">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Organization Information</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Organization Name</p>
                    <p className="text-white">{caseData.organization || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Department</p>
                    <p className="text-white">{caseData.userDetails?.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Org/Dept ID</p>
                    <p className="text-white font-mono text-sm">{caseData.userDetails?.orgDeptId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Designation</p>
                    <p className="text-white">{caseData.userDetails?.designation || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-police-red-accent p-2">
                    <User className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Contact Person</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Name</p>
                    <p className="text-white">{caseData.userDetails?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">User Type</p>
                    <p className="text-white">
                      {caseData.userType}
                      {caseData.userDetails?.otherUserType && ` (${caseData.userDetails.otherUserType})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <a href={`mailto:${caseData.userDetails?.email}`} className="text-police-red hover:underline text-sm">
                      {caseData.userDetails?.email || 'N/A'}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Phone</p>
                    <a href={`tel:${caseData.userDetails?.phone}`} className="text-white hover:text-police-red text-sm">
                      {caseData.userDetails?.phone || 'N/A'}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Point of Contact</p>
                    <p className="text-white">{caseData.userDetails?.pointOfContact || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'evidence' && (
            <>
              {/* Upload Evidence - Only if user has write access */}
              {hasWriteAccess && (
                <div className="card">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-police-red-accent p-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Upload Evidence</h2>
                  </div>

                  <form onSubmit={handleUploadEvidence} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-2">
                        Select File
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                        className="input-field"
                        required
                      />
                      {selectedFile && (
                        <div className="mt-2 text-sm text-gray-400">
                          <p>File: {selectedFile.name}</p>
                          <p>Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                          <p>Type: {selectedFile.type || 'Unknown'}</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isUploading || !selectedFile}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? "Uploading to IPFS..." : "Upload Evidence"}
                    </button>
                  </form>
                </div>
              )}

              {/* Evidence Timeline */}
              <div className="card">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-police-red-accent p-2">
                    <Info className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Evidence Timeline</h2>
                </div>

                <EvidenceTimeline
                  evidence={caseData.evidence}
                  totalCount={totalEvidence}
                  currentPage={evidencePage}
                  onPageChange={setEvidencePage}
                  itemsPerPage={evidencePerPage}
                />
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              {/* Full User Details */}
              <div className="card">
                <h3 className="text-lg font-bold text-white mb-4">Complete User Information</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Basic Information</h4>
                    <div className="grid grid-cols-2 gap-4 bg-police-blue-dark p-4">
                      <div>
                        <p className="text-xs text-gray-400">Name</p>
                        <p className="text-white">{caseData.userDetails?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">User Type</p>
                        <p className="text-white">{caseData.userType}</p>
                      </div>
                      {caseData.userDetails?.otherUserType && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Other User Type</p>
                          <p className="text-white">{caseData.userDetails.otherUserType}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Contact Information</h4>
                    <div className="grid grid-cols-2 gap-4 bg-police-blue-dark p-4">
                      <div>
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="text-white">{caseData.userDetails?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-white">{caseData.userDetails?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Wallet Address</p>
                        <p className="text-white font-mono text-sm">{formatAddress(caseData.userDetails?.walletAddress || '')}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Organization Details</h4>
                    <div className="grid grid-cols-2 gap-4 bg-police-blue-dark p-4">
                      <div>
                        <p className="text-xs text-gray-400">Organization Name</p>
                        <p className="text-white">{caseData.userDetails?.organizationName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Department</p>
                        <p className="text-white">{caseData.userDetails?.department || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Designation</p>
                        <p className="text-white">{caseData.userDetails?.designation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Org/Dept ID</p>
                        <p className="text-white">{caseData.userDetails?.orgDeptId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Point of Contact</p>
                        <p className="text-white">{caseData.userDetails?.pointOfContact || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">Timestamps</h4>
                    <div className="grid grid-cols-2 gap-4 bg-police-blue-dark p-4">
                      <div>
                        <p className="text-xs text-gray-400">User Created</p>
                        <p className="text-white text-sm">{formatDate(caseData.userDetails?.createdAt || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">User Updated</p>
                        <p className="text-white text-sm">{formatDate(caseData.userDetails?.updatedAt || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-4">Case Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Total Evidence</span>
                <span className="text-white font-bold">{totalEvidence}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Status</span>
                <StatusBadge status={caseData.status} text={caseData.statusText} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">User Type</span>
                <span className="text-white">{caseData.userType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Case Age</span>
                <span className="text-white">
                  {Math.floor((Date.now() / 1000 - (caseData.createdAt || 0)) / 86400)} days
                </span>
              </div>
            </div>
          </div>

          {/* Access Info */}
          <div className="card bg-police-blue-dark">
            <h3 className="text-sm font-bold text-white mb-3">Your Access Level</h3>
            <div className="space-y-2">
              {hasWriteAccess && (
                <span className="block bg-green-900 text-green-200 px-2 py-1 text-xs font-semibold rounded">
                  ✓ Write Access
                </span>
              )}
              {hasReadAccess && !hasWriteAccess && (
                <span className="block bg-blue-900 text-blue-200 px-2 py-1 text-xs font-semibold rounded">
                  ✓ Read Only Access
                </span>
              )}
              {!hasReadAccess && !hasWriteAccess && (
                <span className="block bg-red-900 text-red-200 px-2 py-1 text-xs font-semibold rounded">
                  ✗ No Access
                </span>
              )}
            </div>
          </div>

          {/* Latest Evidence */}
          {caseData.evidence.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">Latest Evidence</h3>
              <div className="space-y-2">
                {caseData.evidence.slice(0, 3).map((item, index) => (
                  <div key={index} className="bg-police-blue-dark p-2 text-sm">
                    <p className="text-white truncate">{item.fileName || 'Unnamed'}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
                    {item.ipfsCID && (
                      <a
                        href={`${PINATA_GATEWAY}/${item.ipfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-police-red hover:underline text-xs block mt-1"
                      >
                        View on IPFS
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;