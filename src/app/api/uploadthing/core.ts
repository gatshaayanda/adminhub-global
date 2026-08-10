import { createUploadthing, type FileRouter } from "uploadthing/next";

console.log("🧩 UT APP ID:", process.env.UPLOADTHING_APP_ID);
console.log("🧩 UT SECRET (first 10):", process.env.UPLOADTHING_SECRET?.slice(0, 10));

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
