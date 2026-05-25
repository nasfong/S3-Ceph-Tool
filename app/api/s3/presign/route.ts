import { NextResponse, NextRequest } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Agent } from "https";

function getS3Client(req: NextRequest): S3Client {
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
      httpsAgent: new Agent({
        rejectUnauthorized,
      }),
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    const key = searchParams.get("key");
    const action = searchParams.get("action") || "GetObject";
    const disposition = searchParams.get("disposition") || "inline"; // inline or attachment
    const expiresIn = parseInt(searchParams.get("expiresIn") || "300", 10);

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Bucket and key parameters required" },
        { status: 400 }
      );
    }

    if (!["GetObject", "PutObject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be GetObject or PutObject" },
        { status: 400 }
      );
    }

    const client = getS3Client(request);

    // Create the appropriate S3 command
    let command;
    if (action === "GetObject") {
      command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        // For GetObject, add ResponseContentDisposition to control browser behavior
        ...(disposition === "attachment" && {
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key.split("/").pop() || key)}"`,
        }),
      });
    } else {
      command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
      });
    }

    // Generate pre-signed URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signedUrl = await getSignedUrl(client as any, command, {
      expiresIn,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return NextResponse.json({
      success: true,
      url: signedUrl,
      bucket,
      key,
      action,
      disposition,
      expiresIn,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: Math.round(expiresIn / 60),
    });
  } catch (err) {
    console.error("Error generating pre-signed URL:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      bucket?: string;
      key?: string;
      action?: string;
      disposition?: string;
      expiresIn?: number;
    };

    const { bucket, key, action = "GetObject", disposition = "inline", expiresIn = 300 } = body;

    if (!bucket || !key) {
      return NextResponse.json(
        { error: "Missing bucket or key" },
        { status: 400 }
      );
    }

    if (!["GetObject", "PutObject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be GetObject or PutObject" },
        { status: 400 }
      );
    }

    const client = getS3Client(request);

    // Create the appropriate S3 command
    let command;
    if (action === "GetObject") {
      command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(disposition === "attachment" && {
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key.split("/").pop() || key)}"`,
        }),
      });
    } else {
      command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
      });
    }

    // Generate pre-signed URL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signedUrl = await getSignedUrl(client as any, command, {
      expiresIn,
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return NextResponse.json({
      success: true,
      url: signedUrl,
      bucket,
      key,
      action,
      disposition,
      expiresIn,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: Math.round(expiresIn / 60),
    });
  } catch (err) {
    console.error("Error generating pre-signed URL:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}
