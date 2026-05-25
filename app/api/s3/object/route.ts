import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, NextRequest } from "next/server";
import https from "https";

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

export async function DELETE(request: NextRequest) {
  try {
    const endpoint = request.headers.get("x-s3-endpoint");
    const accessKey = request.headers.get("x-s3-access-key");
    const secretKey = request.headers.get("x-s3-secret-key");
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const key = searchParams.get("key");

    if (!endpoint || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing S3 credentials or endpoint" },
        { status: 401 }
      );
    }

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Bucket and key parameters required" },
        { status: 400 }
      );
    }

    const client = getS3Client(request);
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("S3 delete error:", err);
    let errorMessage = "Failed to delete object";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
