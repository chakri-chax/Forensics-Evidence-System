/* eslint-disable @typescript-eslint/no-unused-vars */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { checkIsOwner,checkWriteAccess,checkReadAccess } from "../utils/ethereum";

interface WalletContextType {
  walletAddress: string | null;
  isAdmin: boolean;
  setWalletAddress: (address: string | null) => void;
  disconnect: () => void;
  hasWriteAccess: boolean;
  hasReadAccess: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const [hasReadAccess, setHasReadAccess] = useState(false);
  useEffect(() => {
    const checkAdmin = async () => {
      if (walletAddress) {
        const isOwner = await checkIsOwner(walletAddress);
        const hasWriteAccess = await checkWriteAccess(walletAddress);
        const hasReadAccess = await checkReadAccess(walletAddress);

        setIsAdmin(isOwner);
        setHasWriteAccess(hasWriteAccess);
        setHasReadAccess(hasReadAccess);

      } else {
        setIsAdmin(false);
      }
    };



    checkAdmin();
  }, [walletAddress]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setWalletAddressState(accounts[0]);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  const setWalletAddress = (address: string | null) => {
    setWalletAddressState(address);
  };

  const disconnect = () => {
    setWalletAddressState(null);
    setIsAdmin(false);
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isAdmin,
        setWalletAddress,
        disconnect,
        hasWriteAccess,
        hasReadAccess
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
