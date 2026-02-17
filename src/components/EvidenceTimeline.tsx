/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { 
  FileText, 
  ExternalLink, 
  Download, 
  Image, 
  Video, 
  Music, 
  Archive, 
  Code,
  File,
  Calendar,
  User,
  HardDrive,
  Tag,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react";
import { getIPFSUrl } from "../utils/pinata";
import { formatAddress } from "../utils/ethereum";
const  PINATA_GATEWAY  = import.meta.env.VITE_PINATA_GATEWAY;
// Match the smart contract EvidenceData struct
interface EvidenceData {
  fileName: string;
  fileType: string;
  ipfsCID: string;
  size: number;
  timestamp: number;
  otherMetadata: string;
  submittedBy: string;
}

interface EvidenceTimelineProps {
  evidence: EvidenceData[];
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  showPagination?: boolean;
  onEvidenceClick?: (evidence: EvidenceData) => void;
}

const EvidenceTimeline = ({ 
  evidence, 
  totalCount,
  currentPage = 0,
  onPageChange,
  itemsPerPage = 5,
  showPagination = false,
  onEvidenceClick 
}: EvidenceTimelineProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [copiedCID, setCopiedCID] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mime = fileType.toLowerCase();

    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image className="w-5 h-5" />;
    } else if (mime.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      return <Video className="w-5 h-5" />;
    } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return <Music className="w-5 h-5" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-5 h-5" />;
    } else if (['js', 'ts', 'html', 'css', 'json', 'xml', 'py', 'java'].includes(ext)) {
      return <Code className="w-5 h-5" />;
    } else {
      return <FileText className="w-5 h-5" />;
    }
  };

  const handleCopyCID = async (cid: string) => {
    try {
      await navigator.clipboard.writeText(cid);
      setCopiedCID(cid);
      setTimeout(() => setCopiedCID(null), 2000);
    } catch (err) {
      console.error('Failed to copy CID:', err);
    }
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const parseMetadata = (metadataStr: string) => {
    try {
      return JSON.parse(metadataStr);
    } catch {
      return { raw: metadataStr };
    }
  };

  const handleItemClick = (evidence: EvidenceData) => {
    if (onEvidenceClick) {
      onEvidenceClick(evidence);
    }
  };

  if (evidence.length === 0) {
    return (
      <div className="text-center py-12 bg-police-blue rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No evidence uploaded yet</p>
        <p className="text-xs text-gray-500 mt-2">Upload evidence to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evidence.map((item, index) => {
        const isExpanded = expandedItems.has(index);
        const fileIcon = getFileIcon(item.fileType, item.fileName);
        const ipfsUrl = getIPFSUrl(item.ipfsCID);
        const parsedMetadata = item.otherMetadata ? parseMetadata(item.otherMetadata) : null;

        return (
          <div
            key={`${item.ipfsCID}-${index}`}
            className={`card hover:border-police-red-accent transition-all duration-200 ${
              onEvidenceClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => handleItemClick(item)}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="bg-police-red-accent p-2 rounded flex-shrink-0">
                {fileIcon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-white font-semibold truncate max-w-md">
                        {item.fileName || `Evidence #${index + 1}`}
                      </h4>
                      <span className="text-xs bg-police-blue px-2 py-0.5 rounded text-gray-300">
                        {item.fileType || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(item.size)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.timestamp)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {formatAddress(item.submittedBy)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCID(item.ipfsCID);
                      }}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Copy CID"
                    >
                      <Copy className="w-4 h-4" />
                      {copiedCID === item.ipfsCID && (
                        <span className="absolute bg-green-900 text-green-200 text-xs px-2 py-1 rounded -mt-8 -ml-2">
                          Copied!
                        </span>
                      )}
                    </button>
                    
                    <a
                      href={`https://${PINATA_GATEWAY}/ipfs/${item.ipfsCID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-police-red-accent hover:text-police-red transition-colors"
                      title="View on IPFS"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <a
                      href={`${ipfsUrl}?download=true`}
                      download={item.fileName}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(index);
                      }}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* CID Display */}
                <div className="mt-2 flex items-center gap-2">
                  <Tag className="w-3 h-3 text-gray-500" />
                  <code className="text-xs bg-police-blue-dark px-2 py-1 rounded text-gray-300 truncate">
                    {item.ipfsCID}
                  </code>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm font-semibold text-white mb-3">Evidence Details</h5>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">File Name</p>
                    <p className="text-white break-all">{item.fileName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">File Type</p>
                    <p className="text-white">{item.fileType || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Size (bytes)</p>
                    <p className="text-white">{item.size.toLocaleString()} bytes ({formatFileSize(item.size)})</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Submitted By</p>
                    <p className="text-white font-mono text-sm">{item.submittedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                    <p className="text-white">{formatDate(item.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Blockchain Timestamp</p>
                    <p className="text-white">{item.timestamp}</p>
                  </div>
                </div>

                {/* IPFS Gateway Links */}
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">IPFS Gateways</p>
                  <div className="flex flex-wrap gap-2">
                    {['ipfs.io', 'gateway.pinata.cloud', 'cloudflare-ipfs.com'].map(gateway => (
                      <a
                        key={gateway}
                        href={`https://${gateway}/ipfs/${item.ipfsCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-police-blue hover:bg-police-blue-light text-gray-300 px-2 py-1 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {gateway}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Other Metadata */}
                {parsedMetadata && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-2">Additional Metadata</p>
                    <pre className="text-xs bg-police-blue-dark p-3 rounded overflow-x-auto text-gray-300">
                      {JSON.stringify(parsedMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {showPagination && onPageChange && totalCount && totalCount > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing {currentPage * itemsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * itemsPerPage, totalCount)} of {totalCount} items
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-police-blue hover:bg-police-blue-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={(currentPage + 1) * itemsPerPage >= totalCount}
              className="px-3 py-1 bg-police-blue hover:bg-police-blue-light text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceTimeline;