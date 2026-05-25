import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import https from "https";

export async function POST(req: NextRequest) {
  try {
    const endpoint = req.headers.get("x-s3-endpoint") || "";
    const accessKeyId = req.headers.get("x-s3-access-key") || "";
    const secretAccessKey = req.headers.get("x-s3-secret-key") || "";
    const rejectUnauthorized = req.headers.get("x-s3-reject-unauthorized") !== "false";

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as string;
    const key = formData.get("key") as string;

    if (!file || !bucket || !key) {
      console.error('[POST /api/s3/upload] Missing fields:', {
        hasFile: !!file,
        hasBucket: !!bucket,
        hasKey: !!key,
        file: file ? { name: file.name, size: file.size } : null,
      });
      return NextResponse.json(
        { error: "Missing required fields: file, bucket, key" },
        { status: 400 }
      );
    }

    console.log('[POST /api/s3/upload] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket,
      key,
      keyLength: key.length,
      endpoint: req.headers.get("x-s3-endpoint"),
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('[POST /api/s3/upload] Buffer created:', {
      bufferSize: buffer.length,
      key,
    });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    console.log('[POST /api/s3/upload] Upload successful:', { key, size: buffer.length });
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