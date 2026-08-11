import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  fileUploader: f({
    image: { maxFileSize: "4MB" },
    pdf: { maxFileSize: "2GB" },
  }).onUploadComplete(async ({ file }) => {
    console.log("✅ Uploaded file:", file);
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
