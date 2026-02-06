import { NextResponse } from "next/server";

async function getAuthToken() {
   // Get the environment variables for the Kinde M2M client
  const issuerUrl = process.env.KINDE_ISSUER_URL;
  const m2mClientId = process.env.KINDE_M2M_CLIENT_ID;
  const m2mClientSecret = process.env.KINDE_M2M_CLIENT_SECRET;
  const audience = `${issuerUrl}/api`;

  // If any of the environment variables are missing, throw an error
  if (!issuerUrl || !m2mClientId || !m2mClientSecret) {
    throw new Error("Missing Kinde M2M environment variables");
  }

  // Fetch the access token from the Kinde M2M client
  const response = await fetch(`${process.env.KINDE_ISSUER_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      client_id: m2mClientId,
      client_secret: m2mClientSecret,
      grant_type: "client_credentials",
      audience: audience
    })
  });

  const data = await response.json();
  return data.access_token;
}

// Get the global/environment/business-level feature flags from
//  the Kinde Management API
export async function GET() {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(
      `${process.env.KINDE_ISSUER_URL}/api/v1/environment/feature_flags`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}