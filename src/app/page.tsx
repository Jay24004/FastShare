"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import JSZip from "jszip";
import { genUploader } from "uploadthing/client";

import { Upload, X, File, Check, Link as LinkIcon, Copy, FileWarning, Archive, Download, LoaderCircle, Search } from "lucide-react";
import { OurFileRouter } from "@/app/api/uploadthing/core";
import { useRouter } from "next/navigation";
const { uploadFiles } = genUploader<OurFileRouter>();

const adjectives = [
  "silent",
  "mystic",
  "brave",
  "fuzzy",
  "chaotic",
  "swift",
  "radiant",
  "hidden",
  "fierce",
  "frozen",
  "sleepy",
  "noble",
  "shiny",
  "grumpy",
  "ancient",
  "stealthy",
];

const nouns = [
  "lizard",
  "cloud",
  "phoenix",
  "matrix",
  "walrus",
  "storm",
  "goblin",
  "moon",
  "badger",
  "raven",
  "comet",
  "tiger",
  "squirrel",
  "yeti",
  "glitch",
  "cookie",
];

// Update the ShareResponse type to match the new API response format
type ShareResponse = {
  size: string;
  File: {
    Name: string;
    Size: string;
    Url: string;
  }[];
  createdAt: string;
  ShareCode: string;
  OneTimeCode: boolean;
};

// Add this type for upload history entries
type UploadHistoryEntry = {
  shareResponse: ShareResponse;
  timestamp: string;
  shareLink: string;
};

// Remove EnhancedProgressBar component
// Make a client-only wrapper component
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
};

// Update the decorative background SVG components to be client-only
const FileSharingBackground = () => (
  <div className="absolute inset-0 overflow-hidden z-0 opacity-50">
    <svg width="100%" height="100%" viewBox="0 0 1200 1000" xmlns="http://www.w3.org/2000/svg" className="absolute opacity-5">
      <path d="M0,800 Q300,1000 600,800 T1200,800" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,600 Q300,800 600,600 T1200,600" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,400 Q300,600 600,400 T1200,400" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,200 Q300,400 600,200 T1200,200" fill="none" stroke="var(--primary)" strokeWidth="2" />
    </svg>

    {/* Client-only floating file icons */}
  </div>
);

// Add a Logo component
const FastShareLogo = () => (
  <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1 text-foreground flex items-center justify-center gap-2">
      Fast<span className="text-primary">Share</span>
    </h1>
    <p className="text-foreground text-sm md:text-base">Fast, Simple Sharing</p>
  </motion.div>
);

// Add a connection line animation component
const ConnectionLines = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <svg width="100%" height="100%" className="absolute opacity-[0.03]">
      <pattern id="connectionPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M0 0 L100 100 M0 100 L100 0 M50 0 L50 100 M0 50 L100 50" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#connectionPattern)" />
    </svg>
  </div>
);

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [zipFiles, setZipFiles] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipFileName, setZipFileName] = useState("files.zip");
  const [customZipName, setCustomZipName] = useState("");
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [shareResponse, setShareResponse] = useState<ShareResponse | null>(null);

  // Add new state for upload history
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isValidatingHistory, setIsValidatingHistory] = useState(false);

  // Add state to control warning visibility
  const [showSecurityWarning, setShowSecurityWarning] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum file size in bytes (64MB)
  const MAX_FILE_SIZE = 64 * 1024 * 1024;
  // Allowed file types (empty means all types allowed)
  const ALLOWED_TYPES: string[] = [];
  const router = useRouter();

  // Function to validate a single share code
  const validateShareCode = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/store?code=${code}`);
      return response.ok; // If response is OK, the code is valid
    } catch (error) {
      console.error(`Error validating code ${code}:`, error);
      return false; // Consider the code invalid if there's an error
    }
  };

  // Load and validate upload history from localStorage on component mount
  useEffect(() => {
    const loadAndValidateHistory = async () => {
      const storedHistory = localStorage.getItem("uploadHistory");
      if (!storedHistory) return;

      try {
        setIsValidatingHistory(true);
        const parsedHistory = JSON.parse(storedHistory) as UploadHistoryEntry[];
        setUploadHistory(parsedHistory); // Set initial history

        // Now validate each entry in background
        let validCount = 0;
        let invalidCount = 0;

        const validationResults = await Promise.all(
          parsedHistory.map(async (entry) => {
            const isValid = await validateShareCode(entry.shareResponse.ShareCode);
            if (isValid) {
              validCount++;
              return true;
            } else {
              invalidCount++;
              return false;
            }
          })
        );

        // Filter out invalid entries
        const validatedHistory = parsedHistory.filter((_, index) => validationResults[index]);

        // Update state and localStorage if any invalid entries were found
        if (invalidCount > 0) {
          setUploadHistory(validatedHistory);
          localStorage.setItem("uploadHistory", JSON.stringify(validatedHistory));

          // Show toast with results
          toast.info(`Share links validated`, {
            description: `${validCount} valid, ${invalidCount} expired links removed`,
            duration: 4000,
          });
        } else if (validCount > 0) {
          // All links are valid, show toast
          toast.success(`All share links valid`, {
            description: `${validCount} link${validCount !== 1 ? "s" : ""} verified`,
            duration: 3000,
          });
        }
      } catch (error) {
        console.error("Error validating upload history:", error);
        // If there's an error parsing, clear the corrupted data
        localStorage.removeItem("uploadHistory");
        setUploadHistory([]);
        toast.error("Error in upload history", {
          description: "History data was corrupted and has been reset",
        });
      } finally {
        setIsValidatingHistory(false);
      }
    };

    loadAndValidateHistory();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`,
      };
    }

    if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "File type not supported",
      };
    }

    return { valid: true };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
      // Reset the input to allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const processFiles = (files: File[]) => {
    const newErrors: { [key: string]: string } = {};
    const validFiles = files.filter((file) => {
      const validation = validateFile(file);
      if (!validation.valid && validation.error) {
        newErrors[file.name] = validation.error;
        return false;
      }
      return true;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Show toast for errors
      toast.error("Error adding files", {
        description: "Some files couldn't be added. Check the error messages.",
      });
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    // Clear any error associated with this file
    const newErrors = { ...errors };
    delete newErrors[uploadedFiles[index].name];
    setErrors(newErrors);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Generate a random name for the ZIP file
  const generateRandomZipName = () => {
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective}_${randomNoun}`;
  };

  // Create a ZIP file from the uploaded files using JSZip
  const createZip = async () => {
    return new Promise<Blob>(async (resolve, reject) => {
      setIsCreatingZip(true);

      // Generate a filename based on custom input or random generation
      let zipBaseName;
      if (customZipName.trim()) {
        zipBaseName = customZipName.trim().replace(/[^\w-]/g, "_");
      } else {
        zipBaseName = generateRandomZipName();
        setCustomZipName(zipBaseName); // Ensure customZipName is also set for UI consistency
      }

      const newZipFileName = `${zipBaseName}.zip`;
      setZipFileName(newZipFileName); // <-- Only set here, never revert elsewhere
      console.log(`Creating ZIP with filename: ${newZipFileName}`); // Debug log

      try {
        const zip = new JSZip();

        // Add files to the zip
        for (const file of uploadedFiles) {
          // Read file content
          const fileContent = await readFileAsArrayBuffer(file);
          // Add to zip
          zip.file(file.name, fileContent);
          // Update progress
        }

        // Generate the zip file
        const content = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        });

        // Check if the ZIP file exceeds the maximum size limit
        if (content.size > MAX_FILE_SIZE) {
          throw new Error(`ZIP file size (${formatFileSize(content.size)}) exceeds the maximum allowed size of ${formatFileSize(MAX_FILE_SIZE)}`);
        }

        // Store the zip blob for later download
        setZipBlob(content);

        // Complete
        setTimeout(() => {
          setIsCreatingZip(false);
          resolve(content); // Return the blob directly instead of just resolving
        }, 300);
      } catch (error) {
        console.error("Error creating ZIP:", error);
        toast.error("Error creating ZIP file", {
          description: error instanceof Error ? error.message : "Please try again or upload files individually.",
        });
        setIsCreatingZip(false);
        reject(error);
      }
    });
  };

  // Helper function to read file content
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  // Download the created ZIP file
  const downloadZip = () => {
    if (!zipBlob) {
      toast.error("ZIP file not available", {
        description: "Please create the ZIP file first.",
      });
      return;
    }

    // Create a URL for the Blob
    const url = URL.createObjectURL(zipBlob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFileName;
    document.body.appendChild(a);

    // Trigger download
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Download started", {
      description: `Downloading ${zipFileName}`,
    });
  };

  // Collect client-side metadata for the upload

  // Perform the actual upload using UploadThing
  const performUpload = async (filesToUpload: File[]) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Start the upload process with progress tracking and metadata
      console.log(`Starting upload for ${filesToUpload.map((f) => f.name).join(", ")}`);
      const response = await uploadFiles("fileUploader", {
        files: filesToUpload,
      });

      if (!response || response.length === 0) {
        throw new Error("Upload failed - no response received");
      }

      // Extract URLs from the response and format file information
      const fileItems = response.map((file, index) => ({
        Name: filesToUpload[index].name,
        Size: filesToUpload[index].size.toString(),
        Key: file.key,
      }));

      // Send data to /api/store with updated format
      try {
        const storeResponse = await fetch("/api/store", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Files: fileItems, // Updated to match new API format
          }),
        });

        if (!storeResponse.ok) {
          console.warn("Failed to store file information:", await storeResponse.text());
          throw new Error("Failed to create share link");
        }

        // Parse the response from the API
        const responseData: ShareResponse = await storeResponse.json();
        setShareResponse(responseData);

        // Set share link based on the ShareCode from the response
        const shareUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/f?code=${responseData.ShareCode}`;
        setShareLink(shareUrl);

        // Save to upload history
        saveToHistory(responseData, shareUrl);
      } catch (storeError) {
        console.error("Error storing file information:", storeError);
        throw storeError;
      }

      toast.success("Upload complete!", {
        description: zipFiles && uploadedFiles.length > 1 ? "Your ZIP archive is now ready to share." : "Your files are now ready to share.",
      });

      return true;
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setUploadError(errorMessage);

      toast.error("Upload failed", {
        description: errorMessage,
      });

      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast.warning("Add Files When?", {
        description: "Please add at least one file to share.",
      });
      return;
    }

    // Check if any individual file exceeds the size limit
    const oversizedFile = uploadedFiles.find((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      toast.error("File too large", {
        description: `${oversizedFile.name} exceeds the maximum size of ${formatFileSize(MAX_FILE_SIZE)}.`,
      });
      return;
    }

    // If ZIP option is selected, create the ZIP first
    if (zipFiles && uploadedFiles.length > 1) {
      toast.info("Creating ZIP archive", {
        description: `Preparing ${uploadedFiles.length} files for compression.`,
      });

      try {
        // Wait for zip creation and get the blob directly
        const zipBlobContent = await createZip();

        // Use the zipFileName from state, which is set in createZip
        console.log(zipFileName); // Debug log
        console.log(`ZIP created: ${zipFileName} (${formatFileSize(zipBlobContent.size)})`); // Debug log
        const zipFile = new window.File([zipBlobContent], zipFileName, {
          type: "application/zip",
          lastModified: new Date().getTime(),
        });

        console.log(`Uploading ZIP as: ${zipFile.name} (${formatFileSize(zipFile.size)})`); // Debug log

        // Upload the ZIP file
        await performUpload([zipFile]);
      } catch (error) {
        console.error("Error in ZIP creation process:", error);

        // Check if it's a size-related error, which we already handled in createZip
        if (!(error instanceof Error && error.message.includes("exceeds the maximum allowed size"))) {
          toast.error("Error creating ZIP file", {
            description: "Failed to create ZIP file. Try uploading individual files instead.",
          });
          // Don't automatically fall back to uploading individual files if the ZIP was too large
          // as individual files might still be valid but the user should make a conscious decision
        }
      }
    } else {
      // Upload individual files
      await performUpload(uploadedFiles);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied!", {
        description: "Share link copied to clipboard.",
      });
    }
  };

  const resetUpload = () => {
    setUploadedFiles([]);
    setShareLink(null);
    setErrors({});
  };

  // Handle zip toggle change
  const handleZipToggle = (checked: boolean) => {
    setZipFiles(checked);
    if (checked && !customZipName) {
      const randomName = generateRandomZipName();
      setCustomZipName(randomName);
      setZipFileName(`${randomName}.zip`);
    }
  };

  // Add a helper function to format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to calculate expiration date (24 hours after creation)
  const getExpirationDate = (dateString: string) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 24);
    return formatDate(date.toISOString());
  };

  // Function to save upload to history
  const saveToHistory = (shareResponse: ShareResponse, shareLink: string) => {
    const newEntry: UploadHistoryEntry = {
      shareResponse,
      timestamp: new Date().toISOString(),
      shareLink,
    };

    // Update state
    const updatedHistory = [newEntry, ...uploadHistory].slice(0, 10); // Keep only last 10 entries
    setUploadHistory(updatedHistory);

    // Update localStorage
    localStorage.setItem("uploadHistory", JSON.stringify(updatedHistory));
  };

  // Add a function to clear history
  const clearHistory = () => {
    localStorage.removeItem("uploadHistory");
    setUploadHistory([]);
    toast.success("Upload history cleared");
  };

  // Add function to reuse a share link
  const reuseShareLink = (entry: UploadHistoryEntry) => {
    setShareResponse(entry.shareResponse);
    setShareLink(entry.shareLink);
    toast.success("Share link loaded", {
      description: "You can now copy and share this link again",
    });
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background/90 z-0" />
      <ConnectionLines />
      <ClientOnly>
        <FileSharingBackground />
      </ClientOnly>

      <div className="relative z-10 container mx-auto px-4 py-10 md:py-16 flex flex-col items-center justify-center min-h-screen">
        {/* Logo and Tagline */}
        <FastShareLogo />

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-5xl">
          {/* Security Warning */}
          <AnimatePresence>
            {showSecurityWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 md:mb-8">
                <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-md text-sm shadow-sm">
                  <div className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-shrink-0 text-yellow-600 mt-0.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div className="flex-1 text-yellow-200">
                      <strong className="font-bold">Security Warning:</strong>
                      <p className="mt-1">
                        Do <u>not</u> share files containing:
                      </p>
                      <ul className="list-disc ml-4 mt-1 space-y-0.5">
                        <li>Passwords or credentials</li>
                        <li>Personal identification documents</li>
                        <li>Financial information</li>
                        <li>Sensitive personal data</li>
                      </ul>
                      <p className="mt-1">
                        <strong>No authentication required</strong> - anyone with the share code or link can download your files without logging in.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSecurityWarning(false)}
                      className="text-yellow-300 hover:text-yellow-100 p-1 rounded-full hover:bg-yellow-800/30 transition-colors"
                      aria-label="Dismiss warning">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show Upload Card when history is not shown */}
          {!showHistory && (
            <Card
              className={`w-full transition-all duration-300 ease-in-out overflow-hidden backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg ${
                isDragging ? "border-2 border-dashed border-primary scale-[1.01]" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              <motion.div
                animate={{
                  backgroundColor: isDragging ? "rgba(var(--primary-rgb), 0.05)" : "transparent",
                  scale: isDragging ? 1.005 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <div className="flex flex-col md:flex-row">
                  {/* Left Side: Upload Area */}
                  <div className="flex-1">
                    <CardHeader className="text-center space-y-4 relative">
                      {/* History Button - positioned in top right */}
                      {uploadHistory.length > 0 && !isUploading && !isCreatingZip && (
                        <div className="absolute top-4 right-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-2 bg-background/80 backdrop-blur-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <path d="M12 8v4l3 3" />
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                            History ({uploadHistory.length})
                          </Button>
                        </div>
                      )}

                      <motion.div
                        className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}>
                        <Upload className="w-10 h-10 text-primary" />
                      </motion.div>
                      <CardTitle className="text-3xl font-bold text-foreground">{shareLink ? "Files Ready to Share" : "Upload Your Files"}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {!shareLink ? (
                        <>
                          <div className="text-center space-y-2">
                            <p className="text-foreground">{isDragging ? "Drop your files here" : "Drag and drop files here or click to browse"}</p>
                            <div className="flex items-center justify-center gap-2 text-xs text-foreground">
                              <Badge variant="outline">Max: 64MB</Badge>
                              <Badge variant="outline">Expires: 24h</Badge>
                            </div>
                          </div>

                          {/* Add History Button for when no files are uploaded and history exists */}
                          {uploadHistory.length > 0 && uploadedFiles.length === 0 && (
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-foreground hover:text-primary">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round">
                                  <path d="M12 8v4l3 3" />
                                  <circle cx="12" cy="12" r="10" />
                                </svg>
                                View {uploadHistory.length} Previous Upload{uploadHistory.length !== 1 ? "s" : ""}
                              </Button>
                            </div>
                          )}

                          <div className="flex flex-col items-center gap-4">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              animate={{
                                borderColor: isDragging ? "var(--primary)" : "var(--muted-foreground-30)",
                                backgroundColor: isDragging ? "rgba(var(--primary-rgb), 0.05)" : "transparent",
                              }}
                              className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200`}>
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={isDragging ? "dragging" : "idle"}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-center">
                                  <File className="mx-auto w-12 h-12 text-muted-foreground/50 mb-2" />
                                  <p className="text-sm text-foreground">
                                    {isDragging ? "Release to upload files" : "Drop files or click to select"}
                                  </p>
                                </motion.div>
                              </AnimatePresence>
                            </motion.div>

                            <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-input" ref={fileInputRef} />
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
                              <Button asChild size="lg" className="w-full" variant="default">
                                <label htmlFor="file-input" className="cursor-pointer">
                                  <Upload className="w-4 h-4 mr-2" />
                                  Browse Files
                                </label>
                              </Button>
                            </motion.div>

                            {/* Add Zip Files Checkbox */}
                            {uploadedFiles.length > 1 && (
                              <div className="flex flex-col items-center space-y-2 mt-1 w-full">
                                <div className="flex items-center space-x-2 border rounded-md p-2 w-full">
                                  <Checkbox id="zip-files" checked={zipFiles} onCheckedChange={(checked) => handleZipToggle(checked === true)} />
                                  <label htmlFor="zip-files" className="text-sm cursor-pointer flex items-center">
                                    <Archive className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Create ZIP archive before upload
                                  </label>
                                </div>

                                {/* ZIP Name Input - only shown when ZIP option is enabled */}
                                {zipFiles && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="w-full space-y-1">
                                    <div className="flex items-center">
                                      <label htmlFor="zip-name" className="text-xs text-muted-foreground mr-2">
                                        ZIP file name (optional):
                                      </label>
                                      <Badge variant="outline" className="text-xs">
                                        .zip
                                      </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                      <Input
                                        id="zip-name"
                                        value={customZipName}
                                        onChange={(e) => setCustomZipName(e.target.value)}
                                        placeholder="Enter custom name for ZIP file"
                                        className="text-sm"
                                      />
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCustomZipName(generateRandomZipName())}
                                        title="Generate random name">
                                        <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round">
                                            <path d="M21 8L18.74 5.74A9.75 9.75 0 0 0 12 3C7.44 3 3.78 5.5 2.5 9" />
                                            <path d="M21 16l-2.26 2.26A9.75 9.75 0 0 1 12 21c-4.56 0-8.22-2.5-9.5-6" />
                                            <path d="M3 16h4v4" />
                                            <path d="M21 8h-4V4" />
                                          </svg>
                                        </motion.div>
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">The final filename will include a timestamp and .zip extension</p>
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Upload Button & Progress */}
                          {uploadedFiles.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                              {isCreatingZip ? (
                                <div className="flex justify-center">
                                  <Button disabled className="w-full flex items-center justify-center gap-2" variant="secondary">
                                    <LoaderCircle className="w-4 h-4 animate-spin text-amber-400" />
                                    <span className="font-medium text-amber-400">Creating ZIP archive...</span>
                                  </Button>
                                </div>
                              ) : isUploading ? (
                                <div className="flex justify-center">
                                  <Button disabled className="w-full flex items-center justify-center gap-2" variant="secondary">
                                    <LoaderCircle className="w-4 h-4 animate-spin text-primary" />
                                    <span className="font-medium text-primary">Uploading files...</span>
                                  </Button>
                                </div>
                              ) : (
                                <motion.div className="space-y-4">
                                  {uploadError && (
                                    <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                                      <p className="font-medium">Upload failed</p>
                                      <p className="text-xs mt-1">{uploadError}</p>
                                    </div>
                                  )}
                                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                    <Button onClick={handleUpload} className="w-full" size="lg" disabled={uploadedFiles.length === 0}>
                                      {zipFiles && uploadedFiles.length > 1 ? (
                                        <>
                                          <Archive className="w-4 h-4 mr-2" />
                                          Create ZIP & Upload
                                        </>
                                      ) : (
                                        "Start Upload"
                                      )}
                                    </Button>
                                  </motion.div>
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-6">
                          <div className="flex justify-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                              className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center">
                              <Check className="w-10 h-10 text-green-400" />
                            </motion.div>
                          </div>

                          <div className="space-y-2 text-center">
                            <h3 className="text-2xl font-bold text-primary">Files Ready to Share</h3>
                            <p className="text-base text-foreground">
                              {shareResponse
                                ? `${shareResponse.File.length} ${shareResponse.File.length === 1 ? "file" : "files"} (${formatFileSize(
                                    parseInt(shareResponse.size)
                                  )})`
                                : `Your ${uploadedFiles.length} ${uploadedFiles.length === 1 ? "file is" : "files are"} uploaded`}
                            </p>
                          </div>

                          <div className="p-4 bg-accent/50 rounded-lg border">
                            <div className="flex gap-2">
                              <Input
                                value={shareLink}
                                readOnly
                                className="font-mono text-sm text-foreground"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                              />
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button onClick={copyShareLink} size="icon" variant="outline" className="text-foreground">
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </div>

                            {shareResponse && (
                              <div className="mt-3 text-xs text-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>Share code:</span>
                                  <span className="font-mono">{shareResponse.ShareCode}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Created:</span>
                                  <span>{formatDate(shareResponse.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Expires:</span>
                                  <span>{getExpirationDate(shareResponse.createdAt)}</span>
                                </div>
                                {shareResponse.OneTimeCode && (
                                  <p className="text-amber-400 mt-2">Note: This link can only be accessed once and will expire after download.</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-4 justify-end">
                            <Button variant="outline" className="text-foreground" onClick={resetUpload}>
                              Upload More Files
                            </Button>
                            <Button variant="outline" className="text-foreground" onClick={copyShareLink}>
                              Copy Link
                            </Button>
                            <Button
                              variant="default"
                              className="flex items-center gap-2 text-primary-foreground"
                              onClick={() => (window.location.href = "/f")}>
                              <Download className="w-4 h-4" />
                              Go to Download Page
                            </Button>
                            {zipFiles && uploadedFiles.length > 1 && zipBlob && (
                              <Button variant="default" className="flex items-center gap-2 text-primary-foreground" onClick={downloadZip}>
                                <Download className="w-4 h-4" />
                                Download ZIP
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </div>

                  {/* Right Side: File Preview */}
                  {(uploadedFiles.length > 0 || Object.keys(errors).length > 0) && !shareLink && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:w-80 md:border-l border-t md:border-t-0 p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center">
                              <span>Files to Upload</span>
                              <Badge variant="outline" className="ml-2">
                                {uploadedFiles.length}
                              </Badge>
                            </h3>
                            {zipFiles && (
                              <Badge variant="secondary" className="flex items-center gap-1 text-primary">
                                <Archive className="w-3 h-3" />
                                ZIP
                              </Badge>
                            )}
                          </div>

                          {/* Error Messages */}
                          {Object.keys(errors).length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-destructive/10 rounded-md mb-3">
                              <div className="flex items-start gap-2">
                                <FileWarning className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-destructive">Error with files</p>
                                  <ul className="text-xs text-destructive mt-1 space-y-1">
                                    {Object.entries(errors).map(([filename, error]) => (
                                      <li key={filename}>
                                        <span className="font-medium">{filename}:</span> {error}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          <ScrollArea className="h-[calc(100vh-300px)] max-h-96 w-full">
                            <div className="space-y-2">
                              {uploadedFiles.map((file, index) => (
                                <motion.div
                                  key={`${file.name}-${index}`}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center justify-between p-3 bg-accent/50 rounded-md border hover:bg-accent/70 transition-colors">
                                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <File className="w-5 h-5 text-primary flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{file.name}</p>
                                      <div className="flex items-center mt-1">
                                        <Badge variant="secondary" className="text-xs">
                                          {formatFileSize(file.size)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground ml-2">{file.type || "Unknown type"}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.1, backgroundColor: "rgba(var(--destructive-rgb), 0.1)" }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => removeFile(index)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors">
                                    <X className="w-4 h-4" />
                                  </motion.button>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>

                          {zipFiles && uploadedFiles.length > 1 && (
                            <div className="mt-4 p-3 bg-secondary/30 rounded-md border border-dashed">
                              <div className="flex items-start gap-2">
                                <Archive className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">Files will be zipped</p>
                                  <p className="text-xs text-foreground mt-1">
                                    All {uploadedFiles.length} files will be compressed into a single ZIP archive before upload
                                  </p>
                                  <p className="text-xs text-foreground mt-1">A download will start automatically when the ZIP is created</p>
                                  {customZipName && (
                                    <div className="flex items-center mt-2">
                                      <Badge variant="outline" className="bg-background/80 text-foreground">
                                        <span className="text-xs font-mono">{customZipName}.zip</span>
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>

                {/* Add a subtle indicator when validating history in background */}
                {isValidatingHistory && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-foreground bg-background/90 p-1.5 px-2.5 rounded-full shadow-sm border animate-pulse backdrop-blur-sm">
                    <svg className="animate-spin h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Validating share links...
                  </div>
                )}
              </motion.div>
            </Card>
          )}

          {/* Show History Card when history is shown */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full">
                <Card className="w-full backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg text-foreground">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowHistory(false)}
                          className="flex items-center gap-2 text-foreground hover:text-primary">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6" />
                          </svg>
                          Back to Upload
                        </Button>
                        <div>
                          <CardTitle className="text-2xl text-foreground">Upload History</CardTitle>
                          <p className="text-sm text-foreground mt-1">
                            Your {uploadHistory.length} most recent upload{uploadHistory.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {uploadHistory.length > 0 && (
                          <Button variant="outline" size="sm" onClick={clearHistory} className="text-foreground">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-2">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2" />
                            </svg>
                            Clear All
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-foreground">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {uploadHistory.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-muted-foreground">
                            <path d="M12 8v4l3 3" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No upload history</h3>
                        <p className="text-sm text-foreground mt-2">Your recent uploads will appear here after you share files</p>
                        <Button variant="outline" className="mt-4 text-foreground" onClick={() => setShowHistory(false)}>
                          Start Uploading
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {uploadHistory.map((entry, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border rounded-lg bg-card hover:bg-accent/30 transition-all duration-200 hover:shadow-md overflow-hidden text-foreground">
                            {/* Header with improved design */}
                            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-background flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <LinkIcon className="w-3.5 h-3.5 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-foreground">Share #{index + 1}</h4>
                                    <p className="text-xs text-foreground">{new Date(entry.timestamp).toLocaleDateString()}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {entry.shareResponse.OneTimeCode && (
                                    <Badge variant="destructive" className="text-xs px-2 py-0 text-destructive">
                                      One-time
                                    </Badge>
                                  )}
                                  <div className="flex">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary text-foreground"
                                      onClick={() => {
                                        navigator.clipboard.writeText(entry.shareLink);
                                        toast.success("Link copied!");
                                      }}
                                      title="Copy link">
                                      <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary text-foreground"
                                      onClick={() => {
                                        reuseShareLink(entry);
                                        setShowHistory(false);
                                      }}
                                      title="Use this link">
                                      <LinkIcon className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Share code section */}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 flex items-center gap-2 p-2 bg-muted/40 rounded-md border border-border/40">
                                  <span className="text-xs text-foreground">Code:</span>
                                  <span className="font-mono text-sm text-foreground font-medium tracking-wider">
                                    {entry.shareResponse.ShareCode}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-auto text-foreground"
                                    onClick={() => {
                                      navigator.clipboard.writeText(entry.shareResponse.ShareCode);
                                      toast.success("Share code copied!");
                                    }}
                                    title="Copy share code">
                                    <Copy className="w-3 h-3 text-foreground hover:text-primary" />
                                  </Button>
                                </div>
                              </div>

                              {/* Time info */}
                              <div className="flex items-center justify-between text-xs text-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <span>{formatDate(entry.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  <span>Expires: {getExpirationDate(entry.shareResponse.createdAt).split(",")[0]}</span>
                                </div>
                              </div>
                            </div>

                            {/* File list */}
                            <div className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                                    <File className="w-4.5 h-4.5 text-primary" />
                                  </div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {entry.shareResponse.File.length} {entry.shareResponse.File.length === 1 ? "file" : "files"}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-secondary/30 text-foreground">
                                  {formatFileSize(parseInt(entry.shareResponse.size))}
                                </Badge>
                              </div>

                              {/* Replace div with ScrollArea component */}
                              <ScrollArea className="h-[180px] w-full pr-4">
                                <div className="space-y-2.5 pb-1">
                                  {entry.shareResponse.File.map((file, fileIndex) => (
                                    <div
                                      key={fileIndex}
                                      className="text-xs border border-border/50 rounded-md p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-foreground">
                                      <p className="font-medium truncate text-foreground" title={file.Name}>
                                        {file.Name}
                                      </p>
                                      <div className="flex justify-between mt-1.5 text-foreground">
                                        <span className="font-mono">{formatFileSize(parseInt(file.Size))}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>

                            {/* Footer with actions */}
                            <div className="p-3.5 border-t bg-muted/30 flex justify-between items-center">
                              <div className="text-xs font-medium flex items-center gap-1.5">
                                <Badge variant="outline" className="bg-primary/5 text-foreground px-2 h-5">
                                  {formatFileSize(parseInt(entry.shareResponse.size))}
                                </Badge>
                                <span className="text-foreground">
                                  {entry.shareResponse.File.length} {entry.shareResponse.File.length === 1 ? "file" : "files"}
                                </span>
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 bg-primary/90 hover:bg-primary text-primary-foreground"
                                onClick={() => {
                                  reuseShareLink(entry);
                                  setShowHistory(false);
                                }}>
                                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                                Use Link
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-auto pt-6 text-center text-xs text-foreground">
          <div className="flex justify-center mb-6">
            <Button size="lg" className="cursor-pointer" variant="secondary" onClick={() => router.push("/f")}>
              <Search />
              Looking to download files?
            </Button>
          </div>
          <p>FastShare — Share files with anyone</p>
        </motion.div>
      </div>
    </div>
  );
}
