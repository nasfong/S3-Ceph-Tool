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
    let statusCode = 500;
    const errString = String(err);
    
    // Parse specific S3 errors from error string
    if (errString.includes("SignatureDoesNotMatch")) {
      errorMessage = "Invalid access key or secret key. Please check your credentials.";
      statusCode = 401;
    } else if (errString.includes("InvalidAccessKeyId")) {
      errorMessage = "Invalid access key ID. Please verify your S3 access key is correct.";
      statusCode = 401;
    } else if (errString.includes("NoSuchBucket")) {
      errorMessage = "Bucket not found. Please verify the bucket name and region.";
      statusCode = 404;
    } else if (errString.includes("AccessDenied")) {
      errorMessage = "Access denied. Your credentials do not have permission to list buckets.";
      statusCode = 403;
    } else if (errString.includes("ECONNREFUSED") || errString.includes("connection refused")) {
      errorMessage = "Cannot connect to S3 endpoint. Please verify the endpoint URL is correct and accessible.";
      statusCode = 400;
    } else if (errString.includes("CERT") || errString.includes("certificate")) {
      errorMessage = "SSL certificate verification failed. Try disabling SSL certificate verification.";
      statusCode = 400;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errString },
      { status: statusCode }
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
