import { FolderOpen, Calendar, User, Building2, FileText } from "lucide-react";
import { Case } from "../types";

interface CaseCardProps {
  caseData: Case;
  onClick: () => void;
  additionalInfo?: {
    organization?: string;
    contactPerson?: string;
    evidenceCount?: number;
    userType?: string;
    lastUpdated?: string;
    statusBadgeColor?: string;
  };
}
const statusMap: { [key: number]: string } = {
  0: "OPEN",
  1: "IN PROGRESS",
  2: "PENDING",
  3: "BLOCKED",
  4: "CLOSED"
};
const CaseCard = ({ caseData, onClick, additionalInfo }: CaseCardProps) => {
  const getStatusColor = (status: number) => {
    const colors = {
      0: "bg-green-900 text-green-200", // OPEN
      1: "bg-blue-900 text-blue-200",   // IN PROGRESS
      2: "bg-yellow-900 text-yellow-200", // PENDING
      3: "bg-red-900 text-red-200",     // BLOCKED
      4: "bg-gray-900 text-gray-200"    // CLOSED
    };
    return colors[status as keyof typeof colors] || "bg-gray-900 text-gray-200";
  };

  return (
    <div
      onClick={onClick}
      className="card hover:border-police-red cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-police-blue p-3">
            <FolderOpen className="w-6 h-6 text-police-red" />
          </div>
          <div>
            <h3 className="font-bold text-white">{caseData.caseName}</h3>
            <p className="text-sm text-gray-400">ID: {caseData.caseId}</p>
            {caseData.caseExternalId && (
              <p className="text-xs text-gray-500">Ref: {caseData.caseExternalId}</p>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${additionalInfo?.statusBadgeColor || getStatusColor(caseData.status)}`}>
          { ` ${ statusMap[Number(caseData.status)] ||   caseData.status}`}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Organization Info */}
        {(additionalInfo?.organization || caseData.organization) && (
          <div className="flex items-center gap-2 text-gray-300">
            <Building2 className="w-4 h-4 text-police-red" />
            <span>{additionalInfo?.organization || caseData.organization}</span>
          </div>
        )}

        {/* Contact Person */}
        {(additionalInfo?.contactPerson || caseData.contactPerson) && (
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-4 h-4 text-police-red" />
            <span>{additionalInfo?.contactPerson || caseData.contactPerson}</span>
          </div>
        )}

        {/* User Type */}
        {additionalInfo?.userType && (
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-xs bg-police-blue px-2 py-1 rounded">
              {additionalInfo.userType}
            </span>
          </div>
        )}

        {/* Evidence Count */}
        {additionalInfo?.evidenceCount !== undefined && (
          <div className="flex items-center gap-2 text-gray-300">
            <FileText className="w-4 h-4 text-police-red" />
            <span>{additionalInfo.evidenceCount} evidence items</span>
          </div>
        )}

        {/* Timestamps */}
        <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
          <Calendar className="w-3 h-3" />
          <span>Created: {new Date(caseData.timestamp * 1000).toLocaleDateString()}</span>
        </div>
        
        {additionalInfo?.lastUpdated && (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Calendar className="w-3 h-3" />
            <span>Updated: {additionalInfo.lastUpdated}</span>
          </div>
        )}
      </div>

      {/* Owner Address */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 truncate">
          Owner: {caseData.owner || caseData.createdBy || 'Unknown'}
        </p>
      </div>
    </div>
  );
};

export default CaseCard;