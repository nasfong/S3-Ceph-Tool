import { ENV } from "./env";

export type S3UserDetail = {
  accessKey: string;
  id: string;
  mysabayUserId: string;
  secretKey: string;
  status: string;
  uid: string;
};

type S3UserDetailResponse = {
  data?: { s3_getUserDetail: S3UserDetail };
  errors?: { message: string }[];
};

const GRAPHQL_ENDPOINT = ENV.GATEWAY_URL;

const GET_S3_USER_DETAIL_QUERY = `
  query getS3UserDetail {
    s3_getUserDetail {
      accessKey
      id
      mysabayUserId
      secretKey
      status
      uid
    }
  }
`;

/**
 * Fetch S3 user details from GraphQL endpoint.
 * No longer stores in localStorage - caller is responsible for state management.
 * @param token - Optional auth token for the request
 * @returns S3UserDetail or null if failed
 */
export const fetchS3UserDetail = async (token?: string): Promise<S3UserDetail | null> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "service-code": "cloud_user",
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: GET_S3_USER_DETAIL_QUERY }),
    });

    if (!response.ok) {
      return null;
    }

    const { data, errors }: S3UserDetailResponse = await response.json();

    if (errors?.length) {
      return null;
    }

    const userDetail = data?.s3_getUserDetail;

    if (!userDetail) {
      return null;
    }

    return userDetail;
  } catch (err) {
    console.error("Failed to fetch S3 user detail:", err);
    return null;
  }
};