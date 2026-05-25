#!/bin/bash

# Test the credentials API with MinIO

echo "🧪 Testing Auto-Create Credentials API with MinIO"
echo ""

# MinIO is running on localhost:9000
# Admin credentials: minioadmin / minioadmin123

ENDPOINT="http://localhost:3000"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"
MINIO_ALIAS="minio"

echo "📋 Test 1: Generate credentials without auto-create"
echo "----------------------------------------------------"
curl -X POST $ENDPOINT/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-user",
    "permissions": [{"bucket": "*", "permission": "read-only"}],
    "autoCreate": false
  }' | jq '.'

echo ""
echo ""
echo "📋 Test 2: Auto-create credentials (requires mc CLI)"
echo "-----------------------------------------------------"
curl -X POST $ENDPOINT/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test-user",
    "permissions": [
      {"bucket": "*", "permission": "read-write"}
    ],
    "autoCreate": true,
    "minioAlias": "minio"
  }' | jq '.'

echo ""
echo ""
echo "✅ Tests complete!"
echo ""
echo "MinIO Console: http://localhost:9001"
echo "MinIO API: http://localhost:9000"
echo "Username: minioadmin"
echo "Password: minioadmin123"
