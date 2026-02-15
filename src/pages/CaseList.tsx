/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Search, FolderOpen } from "lucide-react";
import { Case } from "../types";
import { getReadOnlyContract } from "../utils/ethereum";
import CaseCard from "../components/CaseCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { getProvider } from "../utils/ethereum";
interface CaseListProps {
  walletAddress: string;
  onCaseSelect: (caseId: number) => void;
  refreshTrigger?: number;
}

// Interface matching the smart contract structs
interface UserDetails {
  userType: number; // 0: EXAMINER, 1: INVESTIGATOR, 2: ENDUSER, 3: OTHER
  otherUserType: string;
  name: string;
  phone: string;
  email: string;
  orgDeptId: string;
  organizationName: string;
  pointOfContact: string;
  designation: string;
  department: string;
  walletAddress: string;
  createdAt: number;
  updatedAt: number;
}

interface EvidenceData {
  fileName: string;
  fileType: string;
  ipfsCID: string;
  size: number;
  timestamp: number;
  otherMetadata: string;
  submittedBy: string;
}

interface CaseDetails {
  id: number;
  caseId: string;
  caseName: string;
  userDetails: UserDetails;
  evidence: EvidenceData[];
  status: number; // 0: OPEN, 1: INPROGRESS, 2: PENDING, 3: BLOCKED, 4: CLOSED
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

// Extended Case interface for frontend
interface ExtendedCase extends Case {
  caseExternalId: string;
  userDetails: UserDetails;
  evidenceCount: number;
  lastUpdated: number;
  submittedBy: string;
  organization: string;
  contactPerson: string;
}

// Status mapping for display
const statusMap: { [key: number]: string } = {
  0: "OPEN",
  1: "IN PROGRESS",
  2: "PENDING",
  3: "BLOCKED",
  4: "CLOSED"
};

// User type mapping for display
const userTypeMap: { [key: number]: string } = {
  0: "Examiner",
  1: "Investigator",
  2: "End User",
  3: "Other"
};

const CaseList = ({ walletAddress, onCaseSelect, refreshTrigger }: CaseListProps) => {
  const [cases, setCases] = useState<ExtendedCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<ExtendedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCases = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = await getReadOnlyContract();

      // Check if user has read access first
      const hasReadAccess = await contract.hasReadAccess(walletAddress);
      // console.log("Has read access:", hasReadAccess);
      if (!hasReadAccess) {
        setError("You don't have read access to view cases");
        setCases([]);
        setFilteredCases([]);
        return;
      }

      // Get total case count
      const loadedCases: ExtendedCase[] = [];

      let totalCases = 0;
      let contractWithSigner ;
      try {
        // console.log("walletAddress", walletAddress);
        const provider = getProvider();
        // Ensure contract is connected to signer
        const signer = await provider.getSigner();
         contractWithSigner = contract.connect(signer);

        // Verify access
        const hasRead = await contractWithSigner.hasReadAccess(walletAddress);
        // console.log("hasReadAccess:", hasRead);

        if (!hasRead) {
          throw new Error("Wallet does not have read access");
        }

        // Now call with the connected contract
        totalCases = await contractWithSigner.getTotalCases();
        // console.log("Total cases:", totalCases);
      } catch (err) {
        console.error("Error loading cases:", err);
      }
      // Load cases created by this user (if any)
      const userCases = await contractWithSigner.getCasesByCreator(walletAddress, 0, 100);

      // Process user's own cases first
      for (const caseData of userCases) {
        try {
          const extendedCase = await processCaseData(caseData);
          loadedCases.push(extendedCase);
        } catch (err) {
          console.error(`Error processing user case:`, err);
        }
      }

      // Also check other cases if user has read access
      if (Number(totalCases) > 0) {
        // For demonstration, loading cases in batches to avoid gas issues
        const batchSize = 10;
        for (let i = 1; i <= Math.min(Number(totalCases), 50); i += batchSize) {
          const end = Math.min(i + batchSize - 1, Number(totalCases));

          const promises = [];
          for (let j = i; j <= end; j++) {
            promises.push(contractWithSigner.getCase(j));
          }

          const casesBatch = await Promise.all(promises);

          for (const caseData of casesBatch) {
            try {
              // Check if we already added this case
              if (!loadedCases.some(c => c.caseId === Number(caseData.id))) {
                const extendedCase = await processCaseData(caseData);
                loadedCases.push(extendedCase);
              }
            } catch (err) {
              console.error(`Error processing case:`, err);
            }
          }
        }
      }

      // Sort by most recent first
      loadedCases.sort((a, b) => (b.createdAt === undefined ? 0 : b.createdAt) - (a.createdAt === undefined ? 0 : a.createdAt));

      setCases(loadedCases);
      setFilteredCases(loadedCases);

    } catch (err) {
      console.error("Error loading cases:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to process raw case data from contract
  const processCaseData = async (caseData: any): Promise<ExtendedCase> => {
    // Get evidence count (pagination)
    let evidenceCount = 0;
    try {
      // const evidence = await getReadOnlyContract().getCaseEvidence(caseData.id, 0, 1);
      evidenceCount = caseData.evidence?.length || 0;
    } catch (err) {
      console.error("Error loading evidence count:", err);
    }

    return {
      caseId: Number(caseData.id),
      caseExternalId: caseData.caseId,
      caseName: caseData.caseName,
      status: caseData.status,
      // statusText: statusMap[caseData.status] || "UNKNOWN",
      owner: caseData.createdBy,
      createdBy: caseData.createdBy,
      timestamp: Number(caseData.createdAt),
      createdAt: Number(caseData.createdAt),
      lastUpdated: Number(caseData.updatedAt),
      evidence: caseData.evidence || [],
      evidenceCount: evidenceCount,
      authorizedUsers: [], // This can be implemented if needed

      // New fields from enhanced contract
      userDetails: {
        userType: caseData.userDetails.userType,
        otherUserType: caseData.userDetails.otherUserType,
        name: caseData.userDetails.name,
        phone: caseData.userDetails.phone,
        email: caseData.userDetails.email,
        orgDeptId: caseData.userDetails.orgDeptId,
        organizationName: caseData.userDetails.organizationName,
        pointOfContact: caseData.userDetails.pointOfContact,
        designation: caseData.userDetails.designation,
        department: caseData.userDetails.department,
        walletAddress: caseData.userDetails.walletAddress,
        createdAt: Number(caseData.userDetails.createdAt),
        updatedAt: Number(caseData.userDetails.updatedAt)
      },

      // Derived fields for easier access
      organization: caseData.userDetails.organizationName,
      contactPerson: caseData.userDetails.name,
      submittedBy: caseData.createdBy,
      userType: userTypeMap[caseData.userDetails.userType] || "Unknown",
      userTypeValue: caseData.userDetails.userType
    };
  };

  useEffect(() => {
    if (walletAddress) {
      loadCases();
    }
  }, [walletAddress, refreshTrigger]);

  useEffect(() => {
    if (!cases.length) {
      setFilteredCases([]);
      return;
    }

    const filtered = cases.filter(
      (caseItem) =>
        caseItem.caseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.caseExternalId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.caseId.toString().includes(searchTerm) ||
        caseItem.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.userDetails?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCases(filtered);
  }, [searchTerm, cases]);

  const getStatusBadgeColor = (status: number): string => {
    const colors: { [key: number]: string } = {
      0: "bg-green-900 text-green-200", // OPEN
      1: "bg-blue-900 text-blue-200",   // IN PROGRESS
      2: "bg-yellow-900 text-yellow-200", // PENDING
      3: "bg-red-900 text-red-200",     // BLOCKED
      4: "bg-gray-900 text-gray-200"    // CLOSED
    };
    return colors[status] || "bg-gray-900 text-gray-200";
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Case Explorer</h1>
        <p className="text-gray-400">
          {walletAddress ? `Viewing cases for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect wallet to view cases'}
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by case name, ID, organization, or contact person..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Stats Bar */}
      {filteredCases.length > 0 && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-police-blue p-3 rounded">
            <p className="text-gray-400 text-sm">Total Cases</p>
            <p className="text-white text-xl font-bold">{filteredCases.length}</p>
          </div>
          <div className="bg-police-blue p-3 rounded">
            <p className="text-gray-400 text-sm">Open Cases</p>
            <p className="text-white text-xl font-bold">
              {filteredCases.filter(c => c.status == 0).length}
            </p>
          </div>
          <div className="bg-police-blue p-3 rounded">
            <p className="text-gray-400 text-sm">In Progress</p>
            <p className="text-white text-xl font-bold">
              {filteredCases.filter(c => c.status == 1).length}
            </p>
          </div>
          <div className="bg-police-blue p-3 rounded">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-white text-xl font-bold">
              {filteredCases.filter(c => c.status == 2).length}
            </p>
          </div>
          <div className="bg-police-blue p-3 rounded">
            <p className="text-gray-400 text-sm">Blocked</p>
            <p className="text-white text-xl font-bold">
              {filteredCases.filter(c => c.status == 3).length}
            </p>
          </div>
        </div>
      )}

      {filteredCases.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-block bg-police-blue p-4 mb-4 rounded-lg">
            <FolderOpen className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Cases Found</h3>
          <p className="text-gray-400">
            {searchTerm
              ? "No cases match your search criteria"
              : "You don't have access to any cases yet"}
          </p>
          {!searchTerm && (
            <p className="text-gray-500 mt-2">
              Contact the contract owner to grant you read access
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((caseItem) => (
            <CaseCard
              key={caseItem.caseId}
              caseData={caseItem}
              onClick={() => onCaseSelect(caseItem.caseId)}
              additionalInfo={{
                organization: caseItem.organization,
                contactPerson: caseItem.contactPerson,
                evidenceCount: caseItem.evidenceCount,
                userType: caseItem.userType,
                lastUpdated: new Date(caseItem.lastUpdated * 1000).toLocaleDateString(),
                statusBadgeColor: getStatusBadgeColor(Number(caseItem.status))
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseList;