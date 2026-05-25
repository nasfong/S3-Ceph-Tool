import { S3Client, ListBucketsCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
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

export async function GET(request: NextRequest) {
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

    const client = getS3Client(request);
    const data = await client.send(new ListBucketsCommand({}));
    return NextResponse.json({ buckets: data.Buckets ?? [] });
  } catch (err) {
    console.error("S3 list buckets error:", err);
    let errorMessage = "Failed to list buckets";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: String(err) },
      { status: 500 }
    );
  }
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
    const { bucketName, region = "us-east-1" } = body;

    if (!bucketName || typeof bucketName !== "string") {
      return NextResponse.json(
        { error: "Bucket name is required" },
        { status: 400 }
      );
    }

    const client = getS3Client(request);
    await client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: region !== "us-east-1" ? { LocationConstraint: region } : undefined,
      })
    );

    return NextResponse.json(
      { success: true, bucket: { Name: bucketName, CreationDate: new Date().toISOString() } },
      { status: 201 }
    );
  } catch (err) {
    console.error("S3 create bucket error:", err);
    let errorMessage = "Failed to create bucket";
    let statusCode = 500;

    // Handle specific S3 errors
    if (err instanceof Error) {
      // Check for TooManyBuckets error
      const error = err as Error & { Code?: string };
      if (err.message.includes("TooManyBuckets") || error.Code === "TooManyBuckets") {
        errorMessage = "Bucket limit reached. The storage backend has reached its maximum number of buckets. Please delete an existing bucket before creating a new one.";
        statusCode = 400;
      } else {
        errorMessage = err.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: String(err) },
      { status: statusCode }
    );
  }
}
