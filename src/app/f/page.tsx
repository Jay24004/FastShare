"use client";

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Download,
  History,
  Search,
  CalendarClock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Upload,
  FileIcon,
  Copy,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import JSZip from "jszip";

// Use the required interfaces
export interface FileEntry {
  Name: string;
  Size: string;
  Key: string; // Use Key instead of Url
}

export interface Files {
  size: string;
  File: FileEntry[];
  createdAt: Date;
  ShareCode: string;
  OneTimeCode: boolean;
}

// Update upload history entry to use the Files interface
type UploadHistoryEntry = {
  shareResponse: Files;
  timestamp: string;
  shareLink: string;
};

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

// Keep the FileSharingBackground but wrap the animations in ClientOnly
const FileSharingBackground = () => (
  <div className="absolute inset-0 overflow-hidden z-0 opacity-50 dark:opacity-30">
    <svg width="100%" height="100%" viewBox="0 0 1200 1000" xmlns="http://www.w3.org/2000/svg" className="absolute opacity-5 dark:opacity-[0.03]">
      <path d="M0,800 Q300,1000 600,800 T1200,800" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,600 Q300,800 600,600 T1200,600" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,400 Q300,600 600,400 T1200,400" fill="none" stroke="var(--primary)" strokeWidth="2" />
      <path d="M0,200 Q300,400 600,200 T1200,200" fill="none" stroke="var(--primary)" strokeWidth="2" />
    </svg>

    {/* Client-only floating file icons */}
    <ClientOnly>
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-md"
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            }}
            transition={{
              duration: Math.random() * 50 + 50,
              repeat: Infinity,
              repeatType: "reverse",
            }}>
            <svg
              width={Math.random() * 30 + 20}
              height={Math.random() * 30 + 20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-primary/10 dark:text-primary/5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </motion.div>
        ))}
      </div>
    </ClientOnly>
  </div>
);

// Add a Logo component to match the upload page
const FastShareLogo = () => (
  <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-1 text-foreground flex flex-col md:flex-row items-center justify-center gap-2">
      <span className="flex items-center justify-center gap-2">
        <span>
          Fast<span className="text-primary">Share</span>
        </span>
      </span>
    </h1>
    <p className="text-muted-foreground text-xs md:text-base mt-1 md:mt-0">Fast, Simple Sharing</p>
  </motion.div>
);

// Add connection line animation component
const ConnectionLines = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <svg width="100%" height="100%" className="absolute opacity-[0.03] dark:opacity-[0.02]">
      <pattern id="connectionPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M0 0 L100 100 M0 100 L100 0 M50 0 L50 100 M0 50 L100 50" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
      </pattern>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#connectionPattern)" />
    </svg>
  </div>
);

// Helper to get download URL from Key
const getDownloadUrl = (key: string) => {
  const prefix = process.env.NEXT_PUBLIC_DOWNLOAD_PREFIX || "";
  return `${prefix}${key}`;
};

// Define OtpInput component props interface
interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
}

// Reusable Alphanumeric OTP Input Component
const OtpInput = ({ value, onChange, onComplete, length = 6 }: OtpInputProps) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const REGEXP_ALPHANUMERIC = useMemo(() => /^[a-zA-Z0-9]+$/, []);

  // --- Event Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = e.target.value;
    const oldVal = value[index] || "";

    // Allow only single alphanumeric characters
    if (newValue.length > 1) {
      // Don't handle paste here - it's handled by the onPaste event
      return;
    }

    if (newValue === oldVal) return;

    // Update the OTP value
    const newOtp = value.split("");
    newOtp[index] = newValue;
    const finalOtp = newOtp.join("").slice(0, length);
    onChange(finalOtp);

    // Move focus to the next input if a character is entered
    if (newValue && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Trigger onComplete when the OTP is fully entered
    if (finalOtp.length === length) {
      onComplete?.(finalOtp);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move focus to the previous input on backspace if the current input is empty
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text/plain").trim().slice(0, length);

      if (REGEXP_ALPHANUMERIC.test(pastedData)) {
        onChange(pastedData);
        if (pastedData.length === length) {
          onComplete?.(pastedData);
          // Blur the last input if paste is complete
          inputsRef.current[length - 1]?.blur();
        } else {
          // Focus on the next empty slot after paste
          inputsRef.current[pastedData.length]?.focus();
        }
      }
    },
    [length, onComplete, onChange, REGEXP_ALPHANUMERIC]
  );

  // --- Rendering ---
  const renderInputs = () => {
    const inputs = [];
    for (let i = 0; i < length; i++) {
      inputs.push(
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          pattern="[a-zA-Z0-9]*"
          inputMode="text"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleInputChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className={`
            w-10 h-12 md:w-14 md:h-16
            text-center text-xl md:text-3xl font-mono
            bg-background border-2 rounded-lg
            transition-all duration-200
            focus:bg-accent focus:border-primary focus:ring-2 focus:ring-primary/40
            ${value[i] ? "border-primary" : "border-muted"}
            text-foreground placeholder:text-muted-foreground
            outline-none
          `}
          style={{
            boxShadow: value[i] ? "0 0 0 2px var(--primary)" : "0 0 0 1px var(--muted)",
          }}
          autoComplete="off"
        />
      );
      if (i === 2) {
        inputs.push(<div key="separator" className="w-3 h-1 bg-muted rounded-full mx-1" />);
      }
    }
    return inputs;
  };

  return <div className="flex items-center justify-center gap-1 md:gap-3">{renderInputs()}</div>;
};

// Main content component. It's inside a client module, so it can use hooks.
function DownloadPageContent() {
  // ✅ CORRECT: The hook is now called inside the component that uses it.
  const searchParams = useSearchParams();

  const [code, setCode] = useState("");
  const [history, setHistory] = useState<UploadHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const [fileData, setFileData] = useState<Files | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const router = useRouter();

  // Format helpers
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  // Check if there's a code in the URL and get files if found
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      fetchFiles(codeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load history from localStorage and convert date strings to Date objects
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("uploadHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as UploadHistoryEntry[];

        // Convert createdAt strings to Date objects
        const historyWithDates = parsedHistory.map((entry) => ({
          ...entry,
          shareResponse: {
            ...entry.shareResponse,
            createdAt: new Date(entry.shareResponse.createdAt),
          },
        }));

        setHistory(historyWithDates);
      }
    } catch (error) {
      console.error("Error loading history from localStorage:", error);
    }
  }, []);

  // Fetch files from the API or localStorage cache
  const fetchFiles = async (codeToUse: string) => {
    setIsLoading(true);
    setError(null);
    setFileData(null);

    // Check localStorage for cached entry
    try {
      const storedHistory = localStorage.getItem("uploadHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory) as UploadHistoryEntry[];
        const cached = parsedHistory.find((entry) => entry.shareResponse.ShareCode === codeToUse);
        if (cached) {
          setFileData(cached.shareResponse);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Ignore cache errors, fallback to API
    }

    // Fallback to API call if no cache found
    try {
      const response = await fetch(`/api/store?code=${codeToUse}`);

      if (!response.ok) {
        const errorData = await response.json();
        // Show a specific message for 404 Not Found
        if (response.status === 404) {
          setError("No files found for this code. Please check the code and try again.");
          toast.error("Files not found", {
            description: "No files found for this code.",
          });
        } else {
          throw new Error(errorData.message || "Failed to fetch files");
        }
        return;
      }

      const data = await response.json();

      // Convert createdAt string to Date
      if (data.createdAt && typeof data.createdAt === "string") {
        data.createdAt = new Date(data.createdAt);
      }

      setFileData(data);

      // If this is a one-time code and we successfully fetched it,
      // we should remove it from history since it can't be used again
      if (data.OneTimeCode) {
        removeOneTimeCodeFromHistory(codeToUse);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch files");
      toast.error("Failed to access files", {
        description: err instanceof Error ? err.message : "Please check the code and try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Remove one-time codes from history after use
  const removeOneTimeCodeFromHistory = (code: string) => {
    const updatedHistory = history.filter((entry) => !(entry.shareResponse.OneTimeCode && entry.shareResponse.ShareCode === code));

    if (updatedHistory.length !== history.length) {
      setHistory(updatedHistory);
      localStorage.setItem("uploadHistory", JSON.stringify(updatedHistory));
    }
  };

  // Handle code complete
  const handleCodeComplete = (value: string) => {
    if (value.length === 6) {
      handleAccess(value);
    }
  };

  // Handle access button click - now fetches files instead of redirecting
  const handleAccess = (codeToUse: string = code) => {
    if (!codeToUse.trim()) {
      toast.error("Please enter a valid share code");
      return;
    }

    fetchFiles(codeToUse.trim());
  };

  // Handle selecting a share from history - now fetches files instead of redirecting
  const handleSelectShare = (shareCode: string) => {
    fetchFiles(shareCode);
  };

  // Check if a share is expired
  const isExpired = (createdAt: Date) => {
    try {
      const expirationDate = new Date(createdAt);
      expirationDate.setHours(expirationDate.getHours() + 24);
      return new Date() > expirationDate;
    } catch {
      return true;
    }
  };

  // Calculate time remaining
  const getTimeRemaining = (createdAt: Date) => {
    try {
      const expirationDate = new Date(createdAt);
      expirationDate.setHours(expirationDate.getHours() + 24);

      const now = new Date();
      const diffMs = expirationDate.getTime() - now.getTime();

      if (diffMs <= 0) return "Expired";

      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${diffHrs}h ${diffMins}m left`;
    } catch {
      return "Unknown";
    }
  };

  // Function to download a file using fetch and Blob for instant download
  const downloadFile = async (key: string, fileName: string) => {
    try {
      toast.info("Downloading...");
      const url = getDownloadUrl(key);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (err) {
      toast.error("Download failed", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  // Function to download all files as separate downloads
  const downloadAllFiles = () => {
    if (!fileData || !fileData.File || fileData.File.length === 0) return;

    toast.info(`Starting download of ${fileData.File.length} files`);

    // Start downloads with a small delay between each to prevent browser blocking
    fileData.File.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.Key, file.Name);
      }, index * 800); // 800ms delay between downloads
    });
  };

  // Function to download all files as a ZIP archive
  const downloadAllAsZip = async () => {
    if (!fileData || !fileData.File || fileData.File.length === 0) return;
    setIsCreatingZip(true);
    toast.info("Creating ZIP archive...");

    try {
      const zip = new JSZip();
      // Fetch and add each file to the zip
      await Promise.all(
        fileData.File.map(async (file) => {
          const url = getDownloadUrl(file.Key);
          const response = await fetch(url);
          const blob = await response.blob();
          zip.file(file.Name, blob);
        })
      );
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const zipName = fileData.File.length > 1 ? `fastshare_${fileData.ShareCode}.zip` : "files.zip";
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ZIP download started");
    } catch (err) {
      toast.error("Failed to create ZIP", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsCreatingZip(false);
    }
  };

  // Get a pretty file icon based on file extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    // Return appropriate icon based on file type
    switch (extension) {
      case "pdf":
        return <FileIcon className="text-red-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileIcon className="text-blue-500" />;
      case "doc":
      case "docx":
        return <FileIcon className="text-blue-700" />;
      case "xls":
      case "xlsx":
        return <FileIcon className="text-green-600" />;
      case "ppt":
      case "pptx":
        return <FileIcon className="text-orange-600" />;
      case "zip":
      case "rar":
        return <FileIcon className="text-yellow-600" />;
      default:
        return <FileIcon className="text-gray-500" />;
    }
  };

  // Reset the file view to go back to code entry
  const resetView = () => {
    setFileData(null);
    setError(null);
    setCode("");
  };

  // The entire JSX from your component goes here...
  return (
    <div className="relative min-h-screen w-full bg-background">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background/90 z-0" />
      <ConnectionLines />
      <ClientOnly>
        <FileSharingBackground />
      </ClientOnly>

      <div className="relative z-10 container mx-auto px-2 py-6 md:px-4 md:py-10 flex flex-col items-center justify-center min-h-screen">
        {/* Logo and Tagline */}
        <FastShareLogo />

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-xl md:max-w-xl sm:max-w-full">
          {fileData ? (
            // Show file listing view when files are fetched
            <Card className="shadow-lg border-t-4 border-t-primary backdrop-blur-sm bg-background/80 border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Shared Files</CardTitle>
                      <CardDescription>
                        {fileData.File.length} {fileData.File.length === 1 ? "file" : "files"} ({formatFileSize(parseInt(fileData.size))})
                      </CardDescription>
                    </div>
                  </div>

                  {fileData.OneTimeCode && (
                    <Badge variant="destructive" className="text-xs">
                      One-time access
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Share code:</span>
                    <span className="font-mono">{fileData.ShareCode}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={() => {
                        navigator.clipboard.writeText(fileData.ShareCode);
                        toast.success("Code copied");
                      }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Expires {getTimeRemaining(fileData.createdAt)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-end mb-2 gap-2">
                    {fileData.File.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs bg-background/80 backdrop-blur-sm"
                        disabled={isCreatingZip}
                        onClick={downloadAllAsZip}>
                        {isCreatingZip ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Creating ZIP...
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download All as ZIP
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="text-xs bg-background/80 backdrop-blur-sm" onClick={downloadAllFiles}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download All
                    </Button>
                  </div>

                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-2">
                      {fileData.File.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-3 border rounded-lg flex items-center justify-between hover:bg-accent/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">{getFileIcon(file.Name)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate" title={file.Name}>
                                {file.Name}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(parseInt(file.Size))}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="default" size="sm" className="h-8" onClick={async () => await downloadFile(file.Key, file.Name)}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  {fileData.OneTimeCode && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-200 rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-700">One-time access</p>
                          <p className="text-xs text-amber-600 mt-1">
                            These files can only be accessed once. If you need to access them again, please contact the person who shared them.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-6 flex justify-between border-t mt-4">
                <Button variant="outline" onClick={resetView} className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm">
                  <Search className="h-4 w-4" />
                  Enter Another Code
                </Button>

                <Button variant="ghost" onClick={() => router.push("/")} className="flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  Share Files
                </Button>
              </CardFooter>
            </Card>
          ) : error ? (
            // Show error message in card if error exists
            <Card className="shadow-lg border-t-4 border-t-destructive backdrop-blur-sm bg-background/80 border-destructive/10">
              <CardHeader>
                <CardTitle>Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <Button variant="outline" onClick={resetView}>
                    Try Another Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Show code entry and history view when no files are fetched yet
            <Tabs defaultValue="code" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Access Files</h1>
                    <p className="text-sm text-muted-foreground">Enter a code or select from history</p>
                  </div>
                </div>
                <TabsList className="grid grid-cols-2 h-9 bg-background/80 backdrop-blur-sm">
                  <TabsTrigger value="code" className="flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    <span>Code</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <Card className="shadow-lg border-t-4 border-t-primary backdrop-blur-sm bg-background/80 border-primary/10">
                <TabsContent value="code" className="m-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Enter Share Code</CardTitle>
                      <Badge variant="outline" className="font-mono text-xs py-0">
                        6 DIGITS
                      </Badge>
                    </div>
                    <CardDescription>Type the 6-digit code to access your shared files</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex justify-center">
                        <OtpInput value={code} onChange={setCode} onComplete={handleCodeComplete} />
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-destructive">Error accessing files</p>
                                <p className="text-xs text-destructive/80 mt-1">{error}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 text-center justify-center text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-xs">?</span>
                        </div>
                        <p>Share codes are 6 characters found in your share link</p>
                      </div>
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button className="w-full" size="lg" disabled={code.length !== 6 || isLoading} onClick={() => handleAccess()}>
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Accessing Files...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            Access Files <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </CardContent>

                  <div className="px-6 pb-3">
                    <Separator />
                  </div>

                  <CardFooter className="pt-3 pb-6 flex justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Shared files expire after 24 hours
                    </p>

                    {history.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab("history")}>
                        View History
                      </Button>
                    )}
                  </CardFooter>
                </TabsContent>

                <TabsContent value="history" className="m-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Shares</CardTitle>
                      {history.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground h-7"
                          onClick={() => {
                            localStorage.removeItem("uploadHistory");
                            setHistory([]);
                            toast.success("History cleared");
                          }}>
                          Clear All
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      {history.length > 0 ? `You have ${history.length} recent share${history.length !== 1 ? "s" : ""}` : "No recent shares found"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {history.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                          <History className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground font-medium">No history found</p>
                          <p className="text-sm text-muted-foreground/70">Your recent shares will appear here</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2 bg-background/80 backdrop-blur-sm" onClick={() => router.push("/")}>
                          <Upload className="w-4 h-4 mr-2" />
                          Share Files
                        </Button>
                      </motion.div>
                    ) : (
                      <ScrollArea className="h-[350px] pr-4">
                        <div className="space-y-3">
                          {history.map((entry, index) => {
                            const expired = isExpired(entry.shareResponse.createdAt);
                            const timeRemaining = getTimeRemaining(entry.shareResponse.createdAt);

                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`border rounded-lg p-4 transition-all ${
                                  expired
                                    ? "border-muted/50 bg-muted/10"
                                    : "border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 hover:border-primary/30"
                                }`}
                                onClick={() => !expired && handleSelectShare(entry.shareResponse.ShareCode)}
                                whileHover={!expired ? { scale: 1.01, y: -2 } : {}}>
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center ${expired ? "bg-muted" : "bg-primary/20"}`}>
                                      {expired ? (
                                        <XCircle className="w-5 h-5 text-muted-foreground" />
                                      ) : (
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                      )}
                                    </div>
                                    <div>
                                      <h3 className={`text-base font-medium ${expired ? "text-muted-foreground" : ""}`}>
                                        {entry.shareResponse.File.length} {entry.shareResponse.File.length === 1 ? "file" : "files"}
                                      </h3>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(entry.timestamp)}
                                      </p>
                                    </div>
                                  </div>

                                  <Badge variant={expired ? "outline" : "secondary"} className={`text-xs ${expired ? "text-muted-foreground" : ""}`}>
                                    {expired ? "Expired" : timeRemaining}
                                  </Badge>
                                </div>

                                <div className="flex gap-3 items-center">
                                  <div className="flex-1 px-3 py-2 bg-background rounded border">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-muted-foreground">Code:</span>
                                      <span className="text-xs text-muted-foreground">{formatFileSize(parseInt(entry.shareResponse.size))}</span>
                                    </div>
                                    <p className="font-mono text-sm font-medium">{entry.shareResponse.ShareCode}</p>
                                  </div>

                                  {!expired && (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="h-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectShare(entry.shareResponse.ShareCode);
                                      }}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>

                                {entry.shareResponse.OneTimeCode && (
                                  <Badge variant="outline" className="mt-3 bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">
                                    One-time access
                                  </Badge>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>

                  <CardFooter className="pt-3 pb-6 flex justify-between border-t mt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/")}
                      className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm">
                      <Upload className="h-4 w-4" />
                      Share Files
                    </Button>

                    <Button variant="ghost" onClick={() => setActiveTab("code")} className="flex items-center gap-1.5">
                      <Search className="h-4 w-4" />
                      Enter Code
                    </Button>
                  </CardFooter>
                </TabsContent>
              </Card>
            </Tabs>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-auto pt-6 text-center text-xs text-muted-foreground">
          <div className="flex justify-center mb-6">
            <Button size="lg" className="cursor-pointer" variant="secondary" onClick={() => router.push("/")}>
              <Search />
              Looking to share files?
            </Button>
          </div>
          <p>FastShare — Share files with anyone</p>
        </motion.div>
      </div>
    </div>
  );
}

// Default export for the page. It wraps the main content in Suspense.
export default function DownloadPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen text-muted-foreground">Loading...</div>}>
      {/* ✅ CORRECT: Render the component directly. It will handle its own hooks. */}
      <DownloadPageContent />
    </Suspense>
  );
}
