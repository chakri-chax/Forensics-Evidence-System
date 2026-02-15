// export interface Case {
//   caseId: number;
//   caseName: string;
//   status: string;
//   owner: string;
//   timestamp: number;
//   evidence: string[];
//   authorizedUsers: string[];
// }

// export interface Evidence {
//   cid: string;
//   timestamp: number;
//   uploader: string;
// }

// export enum CaseStatus {
//   OPEN = "Open",
//   UNDER_INVESTIGATION = "Under Investigation",
//   EVIDENCE_COLLECTION = "Evidence Collection",
//   ANALYSIS = "Analysis",
//   CLOSED = "Closed",
//   ARCHIVED = "Archived"
// }

// types/index.ts
export enum CaseStatus {
  OPEN = "OPEN",
  INPROGRESS = "IN PROGRESS",
  PENDING = "PENDING",
  BLOCKED = "BLOCKED",
  CLOSED = "CLOSED"
}

export enum UserType {
  EXAMINER = 0,
  INVESTIGATOR = 1,
  ENDUSER = 2,
  OTHER = 3
}
export const CaseStatusInfo = {
  [CaseStatus.OPEN]: {
    label: 'OPEN',
    color: 'bg-green-600',
    icon: '○',
    description: 'Case is open and active'
  },
  [CaseStatus.INPROGRESS]: {
    label: 'IN PROGRESS',
    color: 'bg-blue-600',
    icon: '◔',
    description: 'Investigation in progress'
  },
  [CaseStatus.PENDING]: {
    label: 'PENDING',
    color: 'bg-yellow-600',
    icon: '◑',
    description: 'Awaiting additional information'
  },
  [CaseStatus.BLOCKED]: {
    label: 'BLOCKED',
    color: 'bg-red-600',
    icon: '●',
    description: 'Case is blocked or on hold'
  },
  [CaseStatus.CLOSED]: {
    label: 'CLOSED',
    color: 'bg-gray-600',
    icon: '◕',
    description: 'Case is closed'
  }
} as const;
export interface UserDetails {
  userType: UserType;
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

export interface Evidence {
  fileName: string;
  fileType: string;
  ipfsCID: string;
  size: number;
  timestamp: number;
  otherMetadata: string;
  submittedBy: string;
}

export interface Case {
  caseId: number;
  caseExternalId?: string;
  caseName: string;
  status: CaseStatus;
  statusText?: string;
  owner: string;
  createdBy?: string;
  timestamp: number;
  createdAt?: number;
  lastUpdated?: number;
  evidence: Evidence[];
  evidenceCount?: number;
  authorizedUsers: string[];
  
  // New fields
  userDetails?: UserDetails;
  organization?: string;
  contactPerson?: string;
  submittedBy?: string;
  userType?: string;
  userTypeValue?: number;
  isActive?: boolean;
}