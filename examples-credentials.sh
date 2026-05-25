#!/bin/bash
# Example: Auto-create sub-credentials via API

# Example 1: Create read-only user for a specific bucket
curl -X POST http://localhost:3000/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-readonly",
    "permissions": [
      {
        "bucket": "public-data",
        "permission": "read-only"
      }
    ],
    "autoCreate": true,
    "minioAlias": "minio"
  }'

# Example 2: Create read-write user for all buckets
curl -X POST http://localhost:3000/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ci-pipeline",
    "permissions": [
      {
        "bucket": "*",
        "permission": "read-write"
      }
    ],
    "autoCreate": true,
    "minioAlias": "minio"
  }'

# Example 3: Create user with multiple permissions
curl -X POST http://localhost:3000/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "multi-bucket-user",
    "permissions": [
      {
        "bucket": "logs",
        "permission": "write-only"
      },
      {
        "bucket": "archive",
        "permission": "read-only"
      },
      {
        "bucket": "shared",
        "permission": "read-write"
      }
    ],
    "autoCreate": true,
    "minioAlias": "minio"
  }'

# Example 4: Generate credentials without auto-creating (manual setup)
curl -X POST http://localhost:3000/api/s3/credentials/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "manual-user",
    "permissions": [
      {
        "bucket": "my-bucket",
        "permission": "read-only"
      }
    ],
    "autoCreate": false
  }' | jq '.policyJson' > policy.json

# Then manually create the user:
# mc admin policy create minio policy-manual-user policy.json
# mc admin user add minio manual-user <password>
# mc admin policy attach minio policy-manual-user --user=manual-user
