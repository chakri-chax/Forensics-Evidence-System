import { CaseStatus, CaseStatusInfo } from "../types";
import { Info } from "lucide-react";
import { useState } from "react";

interface StatusBadgeProps {
  status: CaseStatus | string | number;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showTooltip?: boolean;
}

const StatusBadge = ({ 
  status, 
  text, 
  size = 'md', 
  showIcon = false,
  showTooltip = false 
}: StatusBadgeProps) => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const statusNumber = typeof status === 'string' 
    ? getStatusNumberFromString(status) 
    : typeof status === 'number' 
      ? status 
      : CaseStatus.OPEN;

  const getStatusColor = (statusNum: number): string => {
    switch (statusNum) {
      case CaseStatus.OPEN:
        return "bg-green-600";
      case CaseStatus.INPROGRESS:
        return "bg-blue-600";
      case CaseStatus.PENDING:
        return "bg-yellow-600";
      case CaseStatus.BLOCKED:
        return "bg-red-600";
      case CaseStatus.CLOSED:
        return "bg-gray-600";
      default:
        return "bg-police-red";
    }
  };

  const getStatusText = (statusNum: number): string => {
    if (text) return text;
    return CaseStatusInfo[statusNum as keyof typeof CaseStatusInfo]?.label || "UNKNOWN";
  };

  const getStatusIcon = (statusNum: number) => {
    if (!showIcon) return null;
    return CaseStatusInfo[statusNum as keyof typeof CaseStatusInfo]?.icon || "?";
  };

  const getStatusDescription = (statusNum: number): string => {
    return CaseStatusInfo[statusNum as keyof typeof CaseStatusInfo]?.description || "";
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return "px-2 py-0.5 text-xs";
      case 'lg':
        return "px-4 py-2 text-sm";
      default:
        return "px-3 py-1 text-xs";
    }
  };

  const statusNum = statusNumber;
  const colorClass = getStatusColor(statusNum);
  const statusText = getStatusText(statusNum);
  const icon = getStatusIcon(statusNum);
  const description = getStatusDescription(statusNum);

  return (
    <div className="relative inline-flex items-center">
      <span
        className={`${colorClass} ${getSizeClasses()} font-bold uppercase tracking-wide text-white inline-flex items-center gap-1.5 rounded`}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
      >
        {showIcon && <span className="text-lg leading-none">{icon}</span>}
        {statusText}
      </span>
      
      {showTooltip && showTooltipState && description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {description}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Helper function remains the same
function getStatusNumberFromString(statusStr: string): number {
  const upperStatus = statusStr.toUpperCase().replace(/\s+/g, '');
  
  switch (upperStatus) {
    case 'OPEN':
      return CaseStatus.OPEN;
    case 'INPROGRESS':
    case 'IN_PROGRESS':
      return CaseStatus.INPROGRESS;
    case 'PENDING':
      return CaseStatus.PENDING;
    case 'BLOCKED':
      return CaseStatus.BLOCKED;
    case 'CLOSED':
      return CaseStatus.CLOSED;
    default:
      return CaseStatus.OPEN;
  }
}

export default StatusBadge;