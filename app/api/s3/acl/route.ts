import { S3Client, GetBucketPolicyCommand, PutBucketPolicyCommand, DeleteBucketPolicyCommand } from "@aws-sdk/client-s3";
import { NextResponse, NextRequest } from "next/server";
import https from "https";

/**
 * Turns an S3 error into something worth showing a user.
 *
 * The SDK frequently reports `message` as "UnknownError" while the meaningful
 * part (AccessDenied, NoSuchBucket) is only in the error name, so prefer
 * whichever actually says something.
 */
function describeS3Error(err: unknown, fallback: string) {
  const e = err as {
    name?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = e.$metadata?.httpStatusCode;

  if (status === 403 || e.name === "AccessDenied") {
    return {
      message: "You do not have permission to change this bucket's visibility.",
      status: 403,
    };
  }

  const useful =
    e.message && e.message !== "UnknownError" ? e.message : e.name;

  return { message: useful || fallback, status: status ?? 500 };
}

export async function GET(request: NextRequest) {
  try {
    const endpoint = request.headers.get("x-s3-endpoint");
    const accessKey = request.headers.get("x-s3-access-key");
    const secretKey = request.headers.get("x-s3-secret-key");
    const rejectUnauthorized = request.headers.get("x-s3-reject-unauthorized") !== "false";
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");

    if (!endpoint || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing S3 credentials or endpoint" },
        { status: 401 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        { error: "Bucket parameter required" },
        { status: 400 }
      );
    }

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
      requestHandler: {
        httpsAgent: new https.Agent({
          rejectUnauthorized: rejectUnauthorized,
        }),
      },
    });

    // MinIO uses bucket policies for public access, not ACLs
    // Try to get the bucket policy to check if it's public
    // null = we genuinely cannot tell, because this credential may not read the
    // policy. Reporting "private" there would present a guess as fact.
    let isPublic: boolean | null = false;
    try {
      const policyResponse = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
      if (policyResponse.Policy) {
        const policy = JSON.parse(policyResponse.Policy);
        // Check if policy allows public read access
        isPublic = policy.Statement?.some((statement: Record<string, unknown>) => 
          statement.Effect === "Allow" && 
          statement.Principal === "*" &&
          (Array.isArray(statement.Action) ? statement.Action.includes("s3:GetObject") : statement.Action === "s3:GetObject" || statement.Action === "*")
        ) || false;
      }
    } catch (policyErr) {
      const name = (policyErr as { name?: string }).name;
      const status = (policyErr as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;

      // No policy at all means the bucket really is private. Being denied the
      // read is different: we cannot see it, so say so instead of guessing.
      isPublic = status === 403 || name === "AccessDenied" ? null : false;
    }

    return NextResponse.json({ 
      isPublic,
    });
  } catch (err) {
    console.error("S3 get ACL error:", err);
    const { message, status } = describeS3Error(err, "Failed to get bucket ACL");
    return NextResponse.json({ error: message, details: String(err) }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const endpoint = request.headers.get("x-s3-endpoint");
    const accessKey = request.headers.get("x-s3-access-key");
    const secretKey = request.headers.get("x-s3-secret-key");
    const rejectUnauthorized = request.headers.get("x-s3-reject-unauthorized") !== "false";
    
    const body = await request.json();
    const { bucket, isPublic } = body;

    if (!endpoint || !accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Missing S3 credentials or endpoint" },
        { status: 401 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        { error: "Bucket parameter required" },
        { status: 400 }
      );
    }

    if (isPublic === undefined) {
      return NextResponse.json(
        { error: "isPublic parameter required" },
        { status: 400 }
      );
    }

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
      requestHandler: {
        httpsAgent: new https.Agent({
          rejectUnauthorized: rejectUnauthorized,
        }),
      },
    });

    // MinIO uses bucket policies for public access control
    // Create a policy that allows public read access to all objects
    if (isPublic) {
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [`arn:aws:s3:::${bucket}/*`, `arn:aws:s3:::${bucket}`],
          },
        ],
      };

      await s3.send(new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
      }));

      console.log(`[PUT ACL] Bucket ${bucket} set to public with policy`);
    } else {
      // Delete the bucket policy to make it private
      try {
        await s3.send(new DeleteBucketPolicyCommand({
          Bucket: bucket,
        }));
        console.log(`[PUT ACL] Bucket ${bucket} policy deleted (set to private)`);
      } catch (deleteErr) {
        // "No policy" means it is already private — anything else (a denial,
        // for one) really failed, and must not be reported as success.
        const name = (deleteErr as { name?: string }).name;
        if (name !== "NoSuchBucketPolicy") throw deleteErr;
        console.log(`[PUT ACL] No policy to delete — bucket ${bucket} already private`);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: isPublic ? "Bucket set to public" : "Bucket set to private",
      isPublic,
      note: "MinIO uses bucket policies for public access control",
    });
  } catch (err) {
    console.error("S3 set ACL error:", err);
    const { message, status } = describeS3Error(err, "Failed to update bucket policy");
    return NextResponse.json({ error: message, details: String(err) }, { status });
  }
}
