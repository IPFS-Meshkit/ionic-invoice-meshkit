import { Meshkit, MeshkitRecord } from "@meshkit/ionic";

let meshkitInstance: Meshkit | null = null;

async function getMeshkit(): Promise<Meshkit> {
  if (meshkitInstance) {
    return meshkitInstance;
  }

  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt) {
    throw new Error("VITE_PINATA_JWT is not set. Add it to your .env file.");
  }

  meshkitInstance = await Meshkit.init({
    provider: "pinata",
    providerToken: jwt,
  });

  return meshkitInstance;
}

export interface InvoiceBackup {
  name: string;
  created: string;
  modified: string;
  billType: number;
  content: string;
}

export async function testConnection(): Promise<boolean> {
  const meshkit = await getMeshkit();
  return await meshkit.testConnection();
}

export async function backupInvoiceToIPFS(
  file: InvoiceBackup
): Promise<MeshkitRecord<InvoiceBackup>> {
  const meshkit = await getMeshkit();
  return await meshkit.store<InvoiceBackup>(file);
}

export async function restoreInvoiceFromIPFS(
  cid: string
): Promise<InvoiceBackup> {
  const meshkit = await getMeshkit();
  return await meshkit.retrieve<InvoiceBackup>(cid);
}

export async function storeJSON<T>(data: T): Promise<MeshkitRecord<T>> {
  const meshkit = await getMeshkit();
  return await meshkit.store<T>(data);
}

export async function retrieveJSON<T>(cid: string): Promise<T> {
  const meshkit = await getMeshkit();
  return await meshkit.retrieve<T>(cid);
}

export async function uploadFile(file: File): Promise<MeshkitRecord<any>> {
  const meshkit = await getMeshkit();
  return await meshkit.upload(file);
}

export async function downloadFile(cid: string): Promise<Blob> {
  const meshkit = await getMeshkit();
  return await meshkit.download(cid);
}

export async function sendMessage(recipientId: string, payload: any): Promise<MeshkitRecord<any>> {
  const meshkit = await getMeshkit();
  return await meshkit.send(recipientId, payload);
}

export async function receiveMessage(cid: string): Promise<any> {
  const meshkit = await getMeshkit();
  return await meshkit.receive(cid);
}

export async function revokeCID(cid: string): Promise<boolean> {
  const meshkit = await getMeshkit();
  return await meshkit.revoke(cid);
}
