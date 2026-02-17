const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY;

export interface PinataUploadResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export const uploadToPinata = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append("pinataOptions", options);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data: PinataUploadResponse = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    throw error;
  }
};

export const getIPFSUrl = (cid: string): string => {
  return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
};



export const getDownloadUrl = (cid: string, filename?: string) => {
  const url = getIPFSUrl(cid);
  return filename ? `${url}?filename=${encodeURIComponent(filename)}` : url;
};

export const getGatewayOptions = () => [
  { name: 'Pinata', url: 'gateway.pinata.cloud' },
  { name: 'IPFS.io', url: 'ipfs.io' },
  { name: 'Cloudflare', url: 'cloudflare-ipfs.com' },
  { name: 'Dweb', url: 'dweb.link' }
];
