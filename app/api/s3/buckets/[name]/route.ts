import { NextRequest, NextResponse } from "next/server";
import https from "https";
import {
  S3Client,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const bucketName = decodeURIComponent(name);
  const force = req.nextUrl.searchParams.get("force") === "true";

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

  try {
    if (force) {
      let continuationToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            MaxKeys: 1000,
            ContinuationToken: continuationToken,
          })
        );

        const objects = listRes.Contents ?? [];

        if (objects.length > 0) {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: objects.map((o) => ({ Key: o.Key! })),
                Quiet: true,
              },
            })
          );
        }

        continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
      } while (continuationToken);
    }

    await client.send(new DeleteBucketCommand({ Bucket: bucketName }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/s3/buckets/${bucketName}]`, err);
    
    let message = "Failed to delete bucket";
    let statusCode = 500;
    let isBucketNotEmpty = false;
    
    if (err instanceof Error) {
      message = err.message;
      const error = err as Error & { Code?: string };
      if (error.Code === "BucketNotEmpty" || message.includes("BucketNotEmpty")) {
        message = "This bucket contains files and cannot be deleted. Choose 'Force Delete' to empty and delete the bucket.";
        statusCode = 409;
        isBucketNotEmpty = true;
      }
    } else if (typeof err === "object" && err !== null) {
      const errorObj = err as unknown as { Code?: string; message?: string };
      // Check for BucketNotEmpty error directly
      if (errorObj.Code === "BucketNotEmpty") {
        message = "This bucket contains files and cannot be deleted. Choose 'Force Delete' to empty and delete the bucket.";
        statusCode = 409;
        isBucketNotEmpty = true;
      } else {
        message = errorObj.message || errorObj.Code || JSON.stringify(err);
      }
    }
    
    console.error(`[DELETE /api/s3/buckets/${bucketName}] ${isBucketNotEmpty ? "BucketNotEmpty" : "Error"}:`, message);
    
    return NextResponse.json(
      { error: message, bucketNotEmpty: isBucketNotEmpty },
      { status: statusCode }
    );
  }
}
