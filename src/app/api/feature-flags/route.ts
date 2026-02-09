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
async function getEnvironmentFeatureFlags() {
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
    const flags = data?.feature_flags;


    console.log(data);
    // .forEach
    console.log("flags are being logged:", flags);

    // .map (build a new array, e.g. keyed by code)
    const byCode = Object.fromEntries(Object.entries(flags).map(([key, value]: [string, any]) => [key, value.value ]));
    console.log(byCode);

    // create dictionary of flags with the flag name ad the key and the flag value.value (eg. "flag_name": true") as the value
    

    // return NextResponse.json(byCode);
    return byCode;
  } catch (error) {
    return 
      { error: (error as Error).message }
  }
}

// Get the feature flags by specific organization
async function getOrganizationFeatureFlags(organizationId: string) {


  try {
    const token = await getAuthToken();
    const response = await fetch(
      `${process.env.KINDE_ISSUER_URL}/api/v1/organizations/${organizationId}/feature_flags`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      }
    );
    const data = await response.json();
    console.log("data are being logged on the organization function:", data);
    const flags = data?.feature_flags;


    console.log("flags are being logged on the organization function:", flags);

    const orgFeatureFlags = Object.fromEntries(Object.entries(flags).map(([key, value]: [string, any]) => [key, value.value ]));
    console.log(orgFeatureFlags);

    return orgFeatureFlags;
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function GET() {
  console.log("We are getting everything...")
  const orgId = "org_dddca967a530";

  const flags = await getEnvironmentFeatureFlags();
  const organizationFlags = await getOrganizationFeatureFlags(orgId);
  console.log("OrganizationFlags are being logged on the last function:", organizationFlags);

  console.log("We are getting everything... done")
  return NextResponse.json({"Flags": flags, [`${orgId}`]: organizationFlags});
}