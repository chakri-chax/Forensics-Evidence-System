/* eslint-disable @typescript-eslint/no-explicit-any */
import { Interface } from "ethers";
import contractArtifact from "../../artifacts/contracts/CaseManagementSystem.sol/CaseManagementSystem.json";

// Create interface from ABI
const contractInterface = new Interface(contractArtifact.abi);

/**
 * Decode contract error using ABI
 */
export const decodeContractError = (error: any): string => {
  console.log("Raw error:", error);

  try {
    const errorData =
      error?.data ||
      error?.error?.data ||
      error?.receipt?.revertReason;

    if (!errorData) {
      return fallbackError(error);
    }

    // Try decoding with ABI
    const parsedError = contractInterface.parseError(errorData);

    if (!parsedError) {
      return fallbackError(error);
    }

    const errorName = parsedError.name;
    const errorArgs = parsedError.args;

    if (errorArgs && errorArgs.length > 0) {
      return `${errorName}: ${errorArgs
        .map((arg: any) => arg.toString())
        .join(", ")}`;
    }

    return errorName;
  } catch (err) {
    console.log("ABI decode failed:", err);
    return fallbackError(error);
  }
};

/**
 * Fallback decoder
 */
const fallbackError = (error: any): string => {
  if (error?.reason) return error.reason;

  if (error?.message) {
    if (error.message.includes("user rejected")) {
      return "Transaction rejected by user";
    }
    if (error.message.includes("insufficient funds")) {
      return "Insufficient funds for gas";
    }

    const revertMatch = error.message.match(
      /execution reverted: (.*?)(?:"|$)/
    );
    if (revertMatch) return revertMatch[1];
  }

  return "Transaction failed";
};
