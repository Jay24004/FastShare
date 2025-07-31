import { Image, FileArchive, FileCog, FileMinus, FileText, ShieldQuestionMark } from "lucide-react";

type FileType = "png" | "jpg" | "jpeg" | "webp" | "gif" | "svg" | "pdf" | "doc" | "exe" | "zip" | "others";

export const svgs: Record<FileType, React.ElementType> = {
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  svg: FileText,
  pdf: FileMinus,
  doc: FileText,
  exe: FileCog,
  zip: FileArchive,
  others: ShieldQuestionMark,
};


export function getSvgIcon(ext: string): React.ElementType {
  const key = ext.toLowerCase() as FileType;
  return svgs[key] || svgs.others;
}
