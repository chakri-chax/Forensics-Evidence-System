import { ShieldX } from "lucide-react";

interface NoAccessProps {
  walletAddress: string | null;
}

const NoAccess: React.FC<NoAccessProps> = ({ walletAddress }) => {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="card bg-police-blue-dark border border-police-red rounded-xl shadow-xl max-w-lg w-full text-center p-8">

        <div className="flex justify-center mb-4">
          <div className="bg-police-red-accent p-4 rounded-full">
            <ShieldX className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Access Denied
        </h2>

        <p className="text-gray-300 mb-4">
          You do not have permission to read or write case data in this system.
        </p>

        <div className="bg-police-blue-light/20 border border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 break-all">
            Connected Wallet:
          </p>
          <p className="text-sm font-mono text-white mt-1">
            {walletAddress}
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Please contact the contract owner to request access permissions.
        </p>
      </div>
    </div>
  );
};

export default NoAccess;
