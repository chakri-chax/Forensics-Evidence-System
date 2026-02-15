/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contractABI";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectWallet = async (): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
};

export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new ethers.BrowserProvider(window.ethereum);
};

export const getConnectedSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

export const getContract = async () => {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const getReadOnlyContract = () => {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
};

export const checkIsOwner = async (address: string): Promise<boolean> => {
  try {
    const contract = getReadOnlyContract();
    const owner = await contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error("Error checking owner:", error);
    return false;
  }
};

export const checkWriteAccess = async (address: string): Promise<boolean> => {
  try {
    const contract = getReadOnlyContract();
    return await contract.hasWriteAccess(address);
  } catch (error) {
    console.error("Error checking write access:", error);
    return false;
  }
};

export const checkReadAccess = async (address: string): Promise<boolean> => {
  try {
    const contract = getReadOnlyContract();
    return await contract.hasReadAccess(address);
  } catch (error) {
    console.error("Error checking read access:", error);
    return false;
  }
};

export const formatAddress = (address: string): string => {
  if (!address || typeof address !== 'string') return 'Invalid Address';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
