import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import https from "https";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  try {
    const endpoint = req.headers.get("x-s3-endpoint") || "";
    const accessKeyId = req.headers.get("x-s3-access-key") || "";
    const secretAccessKey = req.headers.get("x-s3-secret-key") || "";
    const rejectUnauthorized =
      req.headers.get("x-s3-reject-unauthorized") !== "false";
    const bucket = req.headers.get("x-bucket") || "";
    const key = req.headers.get("x-key") || "";
    const contentType =
      req.headers.get("content-type") || "application/octet-stream";
    const fileName = decodeURIComponent(req.headers.get("x-file-name") || "");
    const fileSize = req.headers.get("x-file-size") || "0";

    const client = new S3Client({
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
      region: "us-east-1",
      requestHandler: {
        requestTimeout: 30000,
        httpsAgent: new https.Agent({
          rejectUnauthorized,
        }),
      },
    });

    if (!req.body || !bucket || !key) {
      console.error("[POST /api/s3/upload] Missing fields:", {
        hasFile: !!!req.body,
        hasBucket: !!bucket,
        hasKey: !!key,
      });
      return NextResponse.json(
        { error: "Missing required fields: file, bucket, key" },
        { status: 400 },
      );
    }

    console.log("[POST /api/s3/upload] Starting upload:", {
      fileName,
      fileSize,
      contentType,
      bucket,
      key,

      keyLength: key.length,
      endpoint,
    });

    console.log("[POST /api/s3/upload] Buffer created:", {
      key,
    });
    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: Readable.fromWeb(
          req.body as unknown as import("node:stream/web").ReadableStream,
        ), // ✅ stream — never buffered
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: 10 * 1024 * 1024,
      leavePartsOnError: false,
    });
    upload.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });
    await upload.done();

    console.log("[POST /api/s3/upload] Upload successful:", {
      key,
      size: fileSize,
    });
    return NextResponse.json({ success: true, key });
  } catch (err) {
    console.error("[POST /api/s3/upload]", err);
    let message = "Upload failed";
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === "object" && err !== null) {
      const errorObj = err as unknown as { message?: string; Code?: string };
      message = errorObj.message || errorObj.Code || JSON.stringify(err);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
