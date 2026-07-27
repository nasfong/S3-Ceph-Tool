import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import https from "https";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 300;

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
        // Time allowed for a single socket to stall, not the whole upload.
        // Generous so large multipart parts on slow links don't get killed.
        requestTimeout: 0,
        connectionTimeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized,
          keepAlive: true,
        }),
      },
    });

    if (!req.body || !bucket || !key) {
      console.error("[POST /api/s3/upload] Missing fields:", {
        hasFile: !req.body,
        hasBucket: !!bucket,
        hasKey: !!key,
      });
      return NextResponse.json(
        { error: "Missing required fields: file, bucket, key" },
        { status: 400 },
      );
    }

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      console.log("[POST /api/s3/upload] Starting upload:", {
        fileName,
        fileSize,
        contentType,
        bucket,
        key,
        keyLength: key.length,
        endpoint,
      });
    }

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
    if (isDev) {
      upload.on("httpUploadProgress", (progress) => {
        console.log("[POST /api/s3/upload] progress:", progress);
      });
    }
    await upload.done();

    if (isDev) {
      console.log("[POST /api/s3/upload] Upload successful:", {
        key,
        size: fileSize,
      });
    }
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

    // A read-only credential fails here with a bare "Access Denied". Say what
    // actually went wrong, so the user knows it isn't a broken upload.
    const httpStatus = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (httpStatus === 403 || /access denied/i.test(message)) {
      return NextResponse.json(
        { error: "You do not have permission to upload to this bucket." },
        { status: 403 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
