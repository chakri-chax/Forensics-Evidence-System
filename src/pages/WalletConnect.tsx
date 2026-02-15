import { useState } from "react";
import { Shield, Wallet } from "lucide-react";
import { connectWallet } from "../utils/ethereum";

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

const WalletConnect = ({ onConnect }: WalletConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const address = await connectWallet();
      onConnect(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-police-red-accent p-4 mb-4">
            <Shield className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Police Forensics Evidence System
          </h1>
          <p className="text-gray-400">
            Secure blockchain-based evidence management
          </p>
        </div>

        <div className="card space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Connect Your Wallet</h2>
            <p className="text-sm text-gray-400">
              Use MetaMask to access the evidence management system
            </p>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full btn-primary flex items-center justify-center gap-3 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>

          <div className="border-t border-police-blue-light pt-4">
            <p className="text-xs text-gray-400 text-center">
              Only authorized personnel with valid wallet credentials can access this system
            </p>
          </div>
        </div>

        <div className="mt-6 card bg-police-blue-dark">
          <h3 className="text-sm font-bold text-white mb-2">System Features</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Immutable evidence storage on blockchain</li>
            <li>• IPFS-backed file integrity</li>
            <li>• Role-based access control</li>
            <li>• Transparent audit trail</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
