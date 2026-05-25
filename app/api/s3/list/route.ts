import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse, NextRequest } from "next/server";
import https from "https";
import { normalizePrefix, sortS3Objects } from "@/lib/s3-prefix";

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
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");
    let prefixParam = searchParams.get("prefix") || "";

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

    // The searchParams already provides the decoded version
    // (Next.js automatically decodes URL parameters)
    // So we use the prefix as-is from searchParams
    let prefix = prefixParam;
    
    // IMPORTANT: For S3 API, we need the ENCODED prefix with proper slash encoding
    // When prefix contains special chars, it may be partially encoded already
    // S3 expects keys exactly as they were stored
    // Examples:
    // - User folder "favicon_io (3)" gets stored as "favicon_io%20%283%29/" in S3
    // - To list contents, we must use Prefix: "favicon_io%20%283%29/"
    // - If we use "favicon_io (3)/", S3 won't find anything
    
    // The prefix from URL is DECODED by Next.js
    // We need to encode each component to match S3 storage
    const prefixParts = prefix.split('/').filter(p => p);
    const encodedPrefixParts = prefixParts.map(part => encodeURIComponent(part));
    const s3Prefix = encodedPrefixParts.length > 0 
      ? encodedPrefixParts.join('/') + '/' 
      : '';
    
    // console.log('[GET /api/s3/list] URL prefix handling:', {
    //   rawQueryParam: prefixParam,
    //   decodedPrefix: prefix,
    //   prefixParts,
    //   encodedPrefixParts,
    //   s3Prefix,
    //   bucket,
    //   endpoint,
    // });

    const client = getS3Client(request);
    const data = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: s3Prefix,  // Use the properly encoded prefix for S3
        Delimiter: "/",
      })
    );

    // console.log('[GET /api/s3/list] S3 Response:', {
    //   queryPrefix: prefix,
    //   s3Prefix,
    //   commonPrefixes: data.CommonPrefixes?.map(cp => ({
    //     Prefix: cp.Prefix,
    //     decodedName: cp.Prefix ? decodeURIComponent(cp.Prefix.replace(/\/$/, '')) : '',
    //   })) || [],
    //   contentCount: data.Contents?.length || 0,
    //   contents: data.Contents?.slice(0, 5).map(obj => ({
    //     Key: obj.Key,
    //     Size: obj.Size,
    //     decodedName: obj.Key ? decodeURIComponent(obj.Key.replace(new RegExp(`^${s3Prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '')) : '',
    //   })) || [],
    // });

    // Combine folders (CommonPrefixes) and files (Contents)
    // CommonPrefixes already include trailing "/" from S3 API
    const folders =
      data.CommonPrefixes?.map((cp) => ({
        Key: cp.Prefix || "",
        Size: 0,
        LastModified: new Date().toISOString(),
        isFolder: true,
      })) || [];

    const files =
      data.Contents?.filter((obj) => obj.Key !== prefix)
        .map((obj) => ({
          Key: obj.Key || "",
          Size: obj.Size || 0,
          LastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
          ETag: obj.ETag,
          ContentType: obj.StorageClass,
          isFolder: false,
        })) || [];

    // Combine and sort: folders first, then files alphabetically
    const combined = sortS3Objects([...folders, ...files]);

    return NextResponse.json({ files: combined, prefix, bucket });
  } catch (err) {
    console.error("S3 list error:", err);
    let errorMessage = "Failed to list S3 objects";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return NextResponse.json(
      { error: errorMessage, details: String(err) },
      { status: 500 }
    );
  }
}