import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanMetadata(value: unknown) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function providerEnvPrefix(provider: string) {
  return provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function providerEnv(provider: string, key: string) {
  const prefix = providerEnvPrefix(provider);
  return Deno.env.get(`${prefix}_${key}`) ?? Deno.env.get(`PROVIDER_${prefix}_${key}`) ?? "";
}

function canExchangeProviderTokens(role: unknown) {
  return ["owner", "admin", "finance"].includes(cleanText(role));
}

function expiresAtFromSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function updateExchangeRun(
  supabase: ReturnType<typeof createClient>,
  exchangeRunId: string,
  patch: Record<string, unknown>
) {
  await supabase
    .from("provider_token_exchange_runs")
    .update({
      ...patch,
      completed_at: patch.completed_at ?? new Date().toISOString()
    })
    .eq("id", exchangeRunId);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const jwt = authorization.replace("Bearer ", "").trim();
  if (!jwt) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser(jwt);
  const user = userResult?.user;
  if (userError || !user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const workspaceId = cleanText(body.workspaceId);
  const providerOAuthRequestId = cleanText(body.providerOAuthRequestId);
  const providerOAuthCallbackEventId = cleanText(body.providerOAuthCallbackEventId);
  const authorizationCode = cleanText(body.authorizationCode);
  const codeVerifier = cleanText(body.codeVerifier);
  const dryRun = Boolean(body.dryRun);

  if (!workspaceId || !providerOAuthRequestId) {
    return jsonResponse({ error: "workspaceId and providerOAuthRequestId are required" }, 400);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership || !canExchangeProviderTokens(membership.role)) {
    return jsonResponse({ error: "Workspace token exchange access denied" }, 403);
  }

  const { data: oauthRequest, error: oauthError } = await supabase
    .from("provider_oauth_requests")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", providerOAuthRequestId)
    .single();

  if (oauthError || !oauthRequest) {
    return jsonResponse({ error: "OAuth request not found" }, 404);
  }

  const callbackQuery = supabase
    .from("provider_oauth_callback_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider_oauth_request_id", providerOAuthRequestId);

  const { data: callbackEvent, error: callbackError } = providerOAuthCallbackEventId
    ? await callbackQuery.eq("id", providerOAuthCallbackEventId).maybeSingle()
    : await callbackQuery.order("received_at", { ascending: false }).limit(1).maybeSingle();

  if (callbackError) {
    return jsonResponse({ error: "OAuth callback lookup failed", detail: callbackError.message }, 500);
  }

  const provider = cleanText(oauthRequest.provider);
  const integrationType = cleanText(oauthRequest.integration_type);
  const exchangeMode = dryRun ? "dry_run" : "authorization_code";
  const startedAt = new Date().toISOString();
  const authorizationCodeHash = authorizationCode ? await sha256Hex(authorizationCode) : null;
  const codeVerifierHash = codeVerifier ? await sha256Hex(codeVerifier) : null;

  const { data: exchangeRun, error: exchangeRunError } = await supabase
    .from("provider_token_exchange_runs")
    .insert({
      workspace_id: workspaceId,
      provider_oauth_request_id: providerOAuthRequestId,
      provider_oauth_callback_event_id: callbackEvent?.id ?? null,
      created_by: user.id,
      integration_type: integrationType,
      provider,
      exchange_mode: exchangeMode,
      status: dryRun ? "prepared" : "exchanging",
      authorization_code_hash: authorizationCodeHash,
      code_verifier_hash: codeVerifierHash,
      started_at: startedAt,
      metadata: {
        raw_authorization_code_stored: false,
        raw_tokens_stored: false,
        initiated_by: user.id,
        callback_event_status: callbackEvent?.status ?? null
      }
    })
    .select("*")
    .single();

  if (exchangeRunError || !exchangeRun) {
    return jsonResponse({ error: "Token exchange run could not be recorded", detail: exchangeRunError?.message }, 500);
  }

  if (dryRun) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "prepared",
      metadata: {
        ...(exchangeRun.metadata ?? {}),
        dry_run: true,
        provider_config_checked: true
      }
    });

    return jsonResponse({
      ok: true,
      status: "prepared",
      provider,
      integration_type: integrationType,
      authorization_code_stored: false,
      tokens_stored_in_workspace_rows: false
    });
  }

  if (!authorizationCode) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "blocked",
      error_code: "missing_authorization_code",
      error_message: "Authorization code must be supplied directly to the Edge Function and is never stored."
    });
    return jsonResponse({ error: "Authorization code is required at the server boundary" }, 400);
  }

  if (cleanText(oauthRequest.code_challenge_method) !== "not_required" && !codeVerifier) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "blocked",
      error_code: "missing_code_verifier",
      error_message: "PKCE code verifier must be supplied directly to the Edge Function and is never stored."
    });
    return jsonResponse({ error: "PKCE code verifier is required at the server boundary" }, 400);
  }

  const tokenEndpoint = providerEnv(provider, "TOKEN_ENDPOINT");
  const clientId = providerEnv(provider, "CLIENT_ID");
  const clientSecret = providerEnv(provider, "CLIENT_SECRET");
  const vaultUrl = Deno.env.get("PROVIDER_CREDENTIAL_VAULT_URL") ?? "";
  const vaultApiKey = Deno.env.get("PROVIDER_CREDENTIAL_VAULT_API_KEY") ?? "";
  const keyVersion = Deno.env.get("PROVIDER_CREDENTIAL_KEY_VERSION") ?? "edge-vault-v1";

  if (!tokenEndpoint || !clientId || !clientSecret || !vaultUrl || !vaultApiKey) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "blocked",
      error_code: "provider_exchange_not_configured",
      error_message: "Provider token endpoint, client credentials, and credential vault endpoint must be configured before exchange.",
      metadata: {
        ...(exchangeRun.metadata ?? {}),
        token_endpoint_configured: Boolean(tokenEndpoint),
        client_id_configured: Boolean(clientId),
        client_secret_configured: Boolean(clientSecret),
        credential_vault_configured: Boolean(vaultUrl && vaultApiKey)
      }
    });
    return jsonResponse({ error: "Provider exchange is not configured" }, 409);
  }

  const tokenRequest = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: cleanText(oauthRequest.redirect_uri),
    client_id: clientId,
    client_secret: clientSecret
  });

  if (codeVerifier) {
    tokenRequest.set("code_verifier", codeVerifier);
  }

  const providerResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenRequest
  });

  const providerText = await providerResponse.text();
  const tokenResponseHash = await sha256Hex(providerText || "{}");
  const providerPayload = await Promise.resolve().then(() => JSON.parse(providerText || "{}")).catch(() => ({
    response_parse_error: true
  })) as Record<string, unknown>;

  if (!providerResponse.ok) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "failed",
      token_response_hash: tokenResponseHash,
      error_code: "provider_token_exchange_failed",
      error_message: "Provider token endpoint rejected the authorization code.",
      metadata: {
        ...(exchangeRun.metadata ?? {}),
        provider_status: providerResponse.status,
        provider_error_code: cleanText(providerPayload.error),
        provider_error_description: cleanText(providerPayload.error_description)
      }
    });
    return jsonResponse({ error: "Provider token exchange failed" }, 502);
  }

  const tokenMaterial = cleanText(providerPayload.refresh_token)
    || cleanText(providerPayload.access_token)
    || cleanText(providerPayload.id_token);

  if (!tokenMaterial) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "failed",
      token_response_hash: tokenResponseHash,
      error_code: "provider_token_missing",
      error_message: "Provider token response did not include a usable token."
    });
    return jsonResponse({ error: "Provider token response did not include a usable token" }, 502);
  }

  const vaultResponse = await fetch(vaultUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vaultApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      workspace_id: workspaceId,
      provider,
      integration_type: integrationType,
      provider_oauth_request_id: providerOAuthRequestId,
      provider_oauth_callback_event_id: callbackEvent?.id ?? null,
      key_version: keyVersion,
      token_response: providerPayload
    })
  });

  const vaultText = await vaultResponse.text();
  const vaultResult = await Promise.resolve().then(() => JSON.parse(vaultText || "{}")).catch(() => ({
    response_parse_error: true
  })) as Record<string, unknown>;

  if (!vaultResponse.ok) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "failed",
      token_response_hash: tokenResponseHash,
      error_code: "credential_vault_write_failed",
      error_message: "Credential vault rejected the provider token payload.",
      metadata: {
        ...(exchangeRun.metadata ?? {}),
        vault_status: vaultResponse.status
      }
    });
    return jsonResponse({ error: "Credential vault write failed" }, 502);
  }

  const credentialRef = cleanText(vaultResult.credential_ref) || cleanText(vaultResult.credentialRef);
  if (!credentialRef) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "failed",
      token_response_hash: tokenResponseHash,
      error_code: "credential_ref_missing",
      error_message: "Credential vault response did not include a credential reference."
    });
    return jsonResponse({ error: "Credential vault response did not include a credential reference" }, 502);
  }

  const tokenExpiresAt = expiresAtFromSeconds(providerPayload.expires_in);
  const tokenFamilyHash = await sha256Hex(tokenMaterial);
  const rotationDueAt = tokenExpiresAt
    ? new Date(new Date(tokenExpiresAt).getTime() - 10 * 60 * 1000).toISOString()
    : null;

  const { data: vaultRow, error: vaultRowError } = await supabase
    .from("provider_credential_vault")
    .upsert({
      workspace_id: workspaceId,
      provider_oauth_request_id: providerOAuthRequestId,
      provider_oauth_callback_event_id: callbackEvent?.id ?? null,
      accounting_connection_id: oauthRequest.accounting_connection_id ?? null,
      bank_account_id: oauthRequest.bank_account_id ?? null,
      integration_type: integrationType,
      provider,
      status: "active",
      credential_ref: credentialRef,
      token_family_hash: tokenFamilyHash,
      encryption_key_version: cleanText(vaultResult.key_version) || keyVersion,
      scopes: Array.isArray(oauthRequest.requested_scopes) ? oauthRequest.requested_scopes : [],
      token_expires_at: tokenExpiresAt,
      last_refreshed_at: new Date().toISOString(),
      rotation_due_at: rotationDueAt,
      metadata: {
        storage_mode: "managed_vault_reference",
        raw_tokens_stored_in_workspace_rows: false,
        ciphertext_exposed_to_browser: false,
        token_response_hash: tokenResponseHash
      }
    }, { onConflict: "workspace_id,provider,integration_type" })
    .select("*")
    .single();

  if (vaultRowError || !vaultRow) {
    await updateExchangeRun(supabase, exchangeRun.id, {
      status: "failed",
      token_response_hash: tokenResponseHash,
      error_code: "credential_vault_metadata_failed",
      error_message: vaultRowError?.message ?? "Credential vault metadata could not be saved."
    });
    return jsonResponse({ error: "Credential vault metadata could not be saved" }, 500);
  }

  await supabase
    .from("provider_oauth_callback_events")
    .update({
      status: "authorized",
      metadata: {
        ...cleanMetadata(callbackEvent?.metadata),
        token_exchange: "vaulted",
        raw_authorization_code_stored: false,
        raw_tokens_stored: false
      }
    })
    .eq("id", callbackEvent?.id ?? "");

  await supabase
    .from("provider_oauth_requests")
    .update({
      status: "authorized",
      authorized_at: new Date().toISOString(),
      error_code: null,
      error_message: null,
      metadata: {
        ...cleanMetadata(oauthRequest.metadata),
        token_exchange: "vaulted",
        credential_vault: "active",
        raw_tokens_stored: false
      }
    })
    .eq("id", providerOAuthRequestId);

  await updateExchangeRun(supabase, exchangeRun.id, {
    status: "vaulted",
    provider_credential_vault_id: vaultRow.id,
    token_response_hash: tokenResponseHash,
    token_expires_at: tokenExpiresAt,
    metadata: {
      ...(exchangeRun.metadata ?? {}),
      credential_ref: credentialRef,
      encryption_key_version: vaultRow.encryption_key_version,
      raw_tokens_stored: false
    }
  });

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "provider_token_exchange.vaulted",
    entity_type: "provider_credential_vault",
    entity_id: vaultRow.id,
    summary: `${provider} token exchange completed and stored as a vault reference`,
    metadata: {
      provider,
      integration_type: integrationType,
      provider_oauth_request_id: providerOAuthRequestId,
      provider_oauth_callback_event_id: callbackEvent?.id ?? null,
      provider_token_exchange_run_id: exchangeRun.id,
      raw_tokens_stored_in_workspace_rows: false
    }
  });

  return jsonResponse({
    ok: true,
    status: "vaulted",
    provider,
    integration_type: integrationType,
    credential_vault_id: vaultRow.id,
    credential_ref: credentialRef,
    authorization_code_stored: false,
    tokens_stored_in_workspace_rows: false
  });
});
