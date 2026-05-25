import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, NextRequest } from "next/server";
import https from "https";
import { normalizePrefix } from "@/lib/s3-prefix";

function getS3Client(req: NextRequest) {
  const endpoint = req.headers.get("x-s3-endpoint") || "";
  const accessKeyId = req.headers.get("x-s3-access-key") || "";
  const secretAccessKey = req.headers.get("x-s3-secret-key") || "";
  const rejectUnauthorized = req.headers.get("x-s3-reject-unauthorized") !== "false";

  return new S3Client({
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    region: "us-east-1",
    requestHandler: {
      requestTimeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized,
      }),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const endpoint = request.headers.get("x-s3-endpoint");
    const accessKey = request.headers.get("x-s3-access-key");
    const secretKey = request.headers.get("x-s3-secret-key");

    if (!endpoint || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing S3 credentials or endpoint" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bucket, folderName, prefix } = body;

    if (!bucket || !folderName) {
      return NextResponse.json(
        { error: "bucket and folderName parameters required" },
        { status: 400 }
      );
    }

    // Normalize the parent prefix
    const parentPrefix = prefix ? normalizePrefix(prefix) : "";
    
    // Create the full folder path
    const encodedFolderName = encodeURIComponent(folderName);
    const folderKey = `${parentPrefix}${encodedFolderName}/`;

    const client = getS3Client(request);

    // Create folder by uploading an empty .keep file
    const keepFileKey = `${folderKey}.keep`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: keepFileKey,
        Body: Buffer.from(""),
        ContentType: "application/x-empty",
      })
    );

    return NextResponse.json({
      success: true,
      folderKey,
      message: `Folder "${folderName}" created successfully`,
    });
  } catch (err) {
    console.error("Create folder error:", err);
    let errorMessage = "Failed to create folder";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: String(err) },
      { status: 500 }
    );
  }
}
