import { PrismaClient } from "@prisma/client";

export interface FileEntry {
  Name: string;
  Size: string;
  Key: string;
}

export interface Files {
  size: string;
  File: FileEntry[];
  createdAt: Date;
  ShareCode: string;
  ExpiresIn: number;
}

class Client {
  private static instance: Client;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): Client {
    if (!Client.instance) {
      Client.instance = new Client();
    }
    return Client.instance;
  }

  formatedUsage(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["B", "KB", "MB", "GB", "TB"];
    let index = 0;
    let size = bytes;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index++;
    }
    return `${size.toFixed(2)} ${units[index]}`;
  }

  async GenerateShareCode(): Promise<string> {
    const timestampPart = Date.now().toString(36).slice(-4);

    const randomPart = Math.random().toString(36).substring(2, 4);

    const uniqueCode = `${timestampPart}${randomPart}`.toUpperCase();

    return uniqueCode;
  }

  async createFileEntry(files: FileEntry[], FileDuration: number): Promise<Files> {
    const shareCode = await this.GenerateShareCode();
    const TotalSize = files.reduce((acc, file) => acc + parseInt(file.Size, 10), 0).toString();
    const formatedFiles = files.map((file) => ({
      Name: file.Name,
      Size: file.Size,
      Key: file.Key,
    }));
    // forCreatedAt use the utc 0 as timezone
    const fileEntry = await this.prisma.fileStore.create({
      data: {
        Size: TotalSize,
        Files: formatedFiles,
        ShareCode: shareCode,
        CreatedAt: new Date().toISOString(),
        ExpiresIn: FileDuration,
      },
    });
    return {
      size: fileEntry.Size,
      File: fileEntry.Files,
      createdAt: fileEntry.CreatedAt,
      ShareCode: fileEntry.ShareCode,
      ExpiresIn: fileEntry.ExpiresIn,
    };
  }

  async getFileEntry(shareCode: string): Promise<Files | null> {
    const fileEntry = await this.prisma.fileStore.findUnique({
      where: { ShareCode: shareCode },
    });
    if (!fileEntry) return null;
    return {
      size: fileEntry.Size,
      File: fileEntry.Files, // includes iv and tag for each file
      createdAt: fileEntry.CreatedAt,
      ShareCode: fileEntry.ShareCode,
      ExpiresIn: fileEntry.ExpiresIn,
    };
  }

  async delelteFileEntry(shareCode: string): Promise<boolean> {
    const fileEntry = await this.prisma.fileStore.findUnique({
      where: { ShareCode: shareCode },
    });
    if (!fileEntry) return false;
    const deleteFiles = fileEntry.Files.map((file) => file.Key);
    console.log("Files to delete:", deleteFiles);
    const res = fetch(`https://api.uploadthing.com/v6/deleteFiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "X-Uploadthing-Api-Key": "",
        "X-Uploadthing-Api-Key": process.env.UPLOADTHING_API_TOKEN || "",
      },
      body: JSON.stringify({
        fileKeys: deleteFiles,
      }),
    });
    const deleteResult = await res.then((response) => response.json());
    console.log("Delete result:", deleteResult);
    return true;
  }

  async getAllExpiredFiles(): Promise<Files[]> {
    const currentDate = new Date().toISOString();
    const files = await this.prisma.fileStore.findMany({});
    const expiredFiles = files.filter((file) => {
      const expirationTime = new Date(file.CreatedAt);
      expirationTime.setSeconds(expirationTime.getSeconds() + file.ExpiresIn);
      return expirationTime < new Date(currentDate);
    });
    return expiredFiles.map((file) => ({
      size: file.Size,
      File: file.Files,
      createdAt: file.CreatedAt,
      ShareCode: file.ShareCode,
      ExpiresIn: file.ExpiresIn,
    }));
  }

  async deleteExpiredFiles(): Promise<number> {
    const expiredFiles = await this.getAllExpiredFiles();
    console.log("Expired files to delete:", expiredFiles);
    for (const file of expiredFiles) {
      await this.delelteFileEntry(file.ShareCode);
      await this.prisma.fileStore.delete({
        where: { ShareCode: file.ShareCode },
      });
    }
    return expiredFiles.length;
  }

  async GetUsageInfo(): Promise<{ totalBytes: number; appTotalBytes: number; filesUploaded: number; limitBytes: number }> {
    const res = fetch(`https://api.uploadthing.com/v6/getUsageInfo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Uploadthing-Api-Key": process.env.UPLOADTHING_API_TOKEN || "",
      },
    });
    const usageInfo = await res.then((response) => response.json());
    return {
      totalBytes: usageInfo.totalBytes,
      appTotalBytes: usageInfo.appTotalBytes,
      filesUploaded: usageInfo.filesUploaded,
      limitBytes: usageInfo.limitBytes,
    };
  }
}
export const client = Client.getInstance();
