/* eslint-disable @typescript-eslint/no-unused-vars */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { checkIsOwner, checkWriteAccess, checkReadAccess } from "../utils/ethereum";

interface WalletContextType {
  walletAddress: string | null;
  isAdmin: boolean;
  setWalletAddress: (address: string | null) => void;
  disconnect: () => void;
  hasWriteAccess: boolean;
  hasReadAccess: boolean;
  chainId: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddressState] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const [hasReadAccess, setHasReadAccess] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);
  // Debug function to log state
  const logState = useCallback((action: string, data?: any) => {
   
  }, [walletAddress, chainId, isAdmin, hasWriteAccess, hasReadAccess]);

  // Function to check permissions
  const checkPermissions = useCallback(async (address: string, currentChainId?: string | null) => {
    
    try {
      const [isOwner, writeAccess, readAccess] = await Promise.all([
        checkIsOwner(address),
        checkWriteAccess(address),
        checkReadAccess(address)
      ]);

     

      setIsAdmin(isOwner);
      setHasWriteAccess(writeAccess);
      setHasReadAccess(readAccess);
      
      return { isOwner, writeAccess, readAccess };
    } catch (error) {
      console.error("[WalletContext] Error checking permissions:", error);
      // Reset permissions on error
      setIsAdmin(false);
      setHasWriteAccess(false);
      setHasReadAccess(false);
      throw error;
    }
  }, [chainId]);

  // Get initial chain ID and account
  useEffect(() => {
    const initializeWallet = async () => {
      if (window.ethereum) {
        try {
          // Get initial chain ID
          const initialChainId = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(initialChainId);

          // Get initial accounts
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            setWalletAddressState(accounts[0]);
            await checkPermissions(accounts[0], initialChainId);
          }
        } catch (error) {
          console.error("[WalletContext] Error initializing wallet:", error);
        }
      } else {
        console.log("[WalletContext] No ethereum object found");
      }
    };

    initializeWallet();
  }, []); // Empty dependency array - only run once on mount

  // Effect for permission checks when wallet or chain changes
  useEffect(() => {
    if (walletAddress) {
      checkPermissions(walletAddress, chainId);
    } else {
      setIsAdmin(false);
      setHasWriteAccess(false);
      setHasReadAccess(false);
    }
  }, [walletAddress, chainId, checkPermissions]);

  // Set up event listeners
  useEffect(() => {
    if (!window.ethereum) {
      return;
    }


    // Handle account changes
    const handleAccountsChanged = async (accounts: string[]) => {
      
      if (accounts.length === 0) {
        disconnect();
      } else {
        const newAddress = accounts[0];
        setWalletAddressState(newAddress);
        // Permissions will be rechecked by the useEffect above
      }
    };

    // Handle chain changes
    const handleChainChanged = (newChainId: string) => {
      
      // Update chain ID
      setChainId(newChainId);
      
      // Log the change
      
      // Note: We don't reload the page anymore, just update state
      // Permissions will be rechecked by the useEffect above
    };

    // Handle connection
    const handleConnect = (connectInfo: { chainId: string }) => {
      setChainId(connectInfo.chainId);
    };

    // Handle disconnect
    const handleDisconnect = (error: { code: number; message: string }) => {
      disconnect();
    };

    // Set up all listeners
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("connect", handleConnect);
    window.ethereum.on("disconnect", handleDisconnect);

    // Log current state after setting up listeners
    logState("Listeners setup complete");

    // Clean up listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("connect", handleConnect);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [chainId, logState]); // Add chainId and logState as dependencies

  const setWalletAddress = (address: string | null) => {
    setWalletAddressState(address);
  };

  const disconnect = () => {
    setWalletAddressState(null);
    setIsAdmin(false);
    setHasWriteAccess(false);
    setHasReadAccess(false);
    logState("After disconnect");
  };

  // Debug: Log state on every render
  useEffect(() => {
    logState("Component rendered");
  });

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        isAdmin,
        setWalletAddress,
        disconnect,
        hasWriteAccess,
        hasReadAccess,
        chainId
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