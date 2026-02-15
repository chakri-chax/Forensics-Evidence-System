import { Shield, LogOut } from "lucide-react";
import { formatAddress } from "../utils/ethereum";

interface NavbarProps {
  walletAddress: string;
  isAdmin: boolean;
  onDisconnect: () => void;
}

const Navbar = ({ walletAddress, isAdmin, onDisconnect }: NavbarProps) => {
  return (
    <nav className="bg-police-blue border-b border-police-blue-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-police-red-accent p-2">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Police Forensics Evidence System
              </h1>
              {isAdmin && (
                <span className="text-xs text-police-red-accent font-semibold">
                  ADMIN ACCESS
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-police-blue-dark px-4 py-2 border border-police-blue-light">
              <p className="text-xs text-gray-400">Connected Wallet</p>
              <p className="text-white font-semibold">{formatAddress(walletAddress)}</p>
            </div>
            <button
              onClick={onDisconnect}
              className="btn-primary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
