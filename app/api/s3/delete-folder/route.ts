import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

/**
 * Delete all objects under a given prefix recursively
 * Handles pagination automatically
 */
async function deleteObjectsUnderPrefix(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<number> {
  let deletedCount = 0;
  let continuationToken: string | undefined;

  while (true) {
    const data = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    if (!data.Contents || data.Contents.length === 0) {
      break;
    }

    // Delete all objects found
    for (const obj of data.Contents) {
      if (obj.Key) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: obj.Key,
          })
        );
        deletedCount++;
      }
    }

    // Continue if there are more results
    if (data.IsTruncated && data.NextContinuationToken) {
      continuationToken = data.NextContinuationToken;
    } else {
      break;
    }
  }

  return deletedCount;
}

export async function DELETE(request: NextRequest) {
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
    const { bucket, folderKey } = body;

    if (!bucket || !folderKey) {
      return NextResponse.json(
        { error: "bucket and folderKey parameters required" },
        { status: 400 }
      );
    }

    const client = getS3Client(request);

    // Normalize the folder key to ensure proper prefix format
    const prefix = normalizePrefix(folderKey);

    // Delete all objects under this prefix recursively
    const deletedCount = await deleteObjectsUnderPrefix(client, bucket, prefix);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} object(s) under prefix "${folderKey}"`,
    });
  } catch (err) {
    console.error("Delete folder error:", err);
    let errorMessage = "Failed to delete folder";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: String(err) },
      { status: 500 }
    );
  }
}
