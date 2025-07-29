import { createUploadthing, type FileRouter } from "uploadthing/next";
const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  fileUploader: f({
    blob: { maxFileSize: "64MB", maxFileCount: 30, minFileCount: 1 }, // Accept all file types with a max size of 32MB
  }).onUploadComplete(async ({ file }) => {
    console.log("File uploaded successfully:", file);
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
