import { NextResponse } from "next/server";



// Below we add a label for interfaces

// -----------------------------------------------------------------------------
// Interfaces
// -----------------------------------------------------------------------------


interface KindeFlag {
  value: string | boolean | number;
}

/**
 * 
 * Computes which flags are overridden per organization by calculating the difference 
 * between the global/environment flag value and the organization flag value. 
 * 
 * @param envFlags - Environment (business-level) flags: type, value
 * @param orgFlags - Organization flags: type, value
 * @returns Map of flag code -> true if overriden (environment_flag.value != organization_flag.value)
 * 
 */
function computeOverrides(
  envFlags: Record<string, unknown>,
  orgFlags: Record<string, unknown>
): Record<string, boolean> {
  const overrides_tracker: Record<string, boolean> = Object.fromEntries(
    Object.keys(envFlags).map((key) => [
      key,
      envFlags[key] !== orgFlags[key],
    ])
  );
  return overrides_tracker;
}

/**
 * 
 * Retrieves the authentication token needed to make API calls to the Kinde Management API. 
 * 
 * @returns The access token. 
 * 
 */
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

/**
 * 
 * Fetches environment-level feature flags from Kinde and returns them as a flat map. 
 * 
 * @returns A map of feature flags with the flag name and the value. 
 * 
 */
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

    const data = await response.json() as { feature_flags: Record<string, KindeFlag> };
    const flags = data?.feature_flags ?? {};

    if ('error' in data) {
      return { error: data.error };
    }

    const envFeatureFlags = Object.fromEntries(Object.entries(flags).map(([key, value]: [string, KindeFlag]) => [key, value.value]));

    return envFeatureFlags

  } catch (error) {
    return { error: (error as Error).message }
  }
}

/**
 * 
 * Fetches organization-level feature flags from Kinde. 
 * 
 * @param organizationId - The ID of the organization we want to retrieve the flags from. 
 * @returns Returns them as a flat map with the flag name and the value. 
 */
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
    const data = await response.json() as { feature_flags: Record<string, KindeFlag> };
    const flags = data?.feature_flags ?? {};
    const orgFeatureFlags = Object.fromEntries(Object.entries(flags).map(([key, value]: [string, KindeFlag]) => [key, value.value]));

    return orgFeatureFlags;
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const orgId = searchParams.get("org");
  if (!orgId) {
    return NextResponse.json({ error: "Missing required search param: org" }, { status: 400 });
  }
 

  try {
    
    const flags = await getEnvironmentFeatureFlags();
    const organizationFlags = await getOrganizationFeatureFlags(orgId);
    const envFlags = flags ?? {};
    const orgFlags = organizationFlags ?? {};

    const overrides_tracker = computeOverrides(envFlags, orgFlags);

    return NextResponse.json({ "Environment flags": flags, [`${orgId}`]: organizationFlags, "Overrides tracker": overrides_tracker });
  }
  catch (error) {
    return { error: (error as Error).message };
  }
}

