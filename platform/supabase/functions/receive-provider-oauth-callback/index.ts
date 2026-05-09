import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
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

function hasExpired(value: unknown) {
  const expiresAt = cleanText(value);
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readCallbackInput(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  if (request.method === "POST") {
    const contentType = request.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      return { ...params, ...cleanMetadata(body) };
    }

    const formData = await request.formData().catch(() => null);
    if (formData) {
      return { ...params, ...Object.fromEntries(formData.entries()) };
    }
  }

  return params;
}

async function recordCallbackEvent(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
) {
  const { error } = await supabase.from("provider_oauth_callback_events").insert(payload);
  return error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing server environment configuration" }, 500);
  }

  const callbackInput = await readCallbackInput(request);
  const requestId = cleanText(callbackInput.request_id) || cleanText(callbackInput.requestId);
  const state = cleanText(callbackInput.state);
  const authorizationCode = cleanText(callbackInput.code);
  const errorCode = cleanText(callbackInput.error);
  const errorDescription = cleanText(callbackInput.error_description) || cleanText(callbackInput.errorDescription);
  const stateNonceHash = state ? await sha256Hex(state) : "";
  const receivedAt = new Date().toISOString();

  if (!requestId && !stateNonceHash) {
    return jsonResponse({ error: "OAuth request id or state is required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const requestQuery = supabase
    .from("provider_oauth_requests")
    .select("*");

  const { data: oauthRequest, error: lookupError } = requestId
    ? await requestQuery.eq("id", requestId).maybeSingle()
    : await requestQuery.eq("state_nonce_hash", stateNonceHash).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (lookupError || !oauthRequest) {
    return jsonResponse({ error: "OAuth request not found" }, 404);
  }

  const baseEvent = {
    workspace_id: oauthRequest.workspace_id,
    provider_oauth_request_id: oauthRequest.id,
    integration_type: oauthRequest.integration_type,
    provider: oauthRequest.provider,
    state_nonce_hash: stateNonceHash || null,
    received_at: receivedAt,
    metadata: {
      callback_method: request.method,
      raw_authorization_code_stored: false,
      raw_tokens_stored: false
    }
  };

  if (!stateNonceHash || cleanText(oauthRequest.state_nonce_hash) !== stateNonceHash) {
    await recordCallbackEvent(supabase, {
      ...baseEvent,
      status: "rejected",
      error_code: "state_mismatch",
      error_description: "OAuth state hash did not match the pending request"
    });

    return jsonResponse({ error: "OAuth state validation failed" }, 400);
  }

  if (hasExpired(oauthRequest.expires_at)) {
    await supabase
      .from("provider_oauth_requests")
      .update({
        status: "expired",
        error_code: "request_expired",
        error_message: "OAuth callback arrived after request expiry"
      })
      .eq("id", oauthRequest.id);

    await recordCallbackEvent(supabase, {
      ...baseEvent,
      status: "rejected",
      error_code: "request_expired",
      error_description: "OAuth callback arrived after request expiry"
    });

    return jsonResponse({ error: "OAuth request expired" }, 409);
  }

  if (errorCode) {
    await supabase
      .from("provider_oauth_requests")
      .update({
        status: "error",
        error_code: errorCode,
        error_message: errorDescription || "Provider returned an OAuth error"
      })
      .eq("id", oauthRequest.id);

    await recordCallbackEvent(supabase, {
      ...baseEvent,
      status: "error",
      error_code: errorCode,
      error_description: errorDescription || "Provider returned an OAuth error"
    });

    return jsonResponse({ error: "Provider returned OAuth error", code: errorCode }, 400);
  }

  if (!authorizationCode) {
    await recordCallbackEvent(supabase, {
      ...baseEvent,
      status: "rejected",
      error_code: "missing_authorization_code",
      error_description: "Provider callback did not include an authorization code"
    });

    return jsonResponse({ error: "Authorization code is required" }, 400);
  }

  const authorizationCodeHash = await sha256Hex(authorizationCode);
  const requestMetadata = cleanMetadata(oauthRequest.metadata);

  await recordCallbackEvent(supabase, {
    ...baseEvent,
    status: "validated",
    authorization_code_hash: authorizationCodeHash,
    metadata: {
      ...baseEvent.metadata,
      token_exchange: "pending",
      callback_validated_at: receivedAt
    }
  });

  const { error: updateError } = await supabase
    .from("provider_oauth_requests")
    .update({
      status: "exchange_pending",
      error_code: null,
      error_message: null,
      metadata: {
        ...requestMetadata,
        callback_received_at: receivedAt,
        callback_status: "validated",
        raw_authorization_code_stored: false,
        token_exchange: "pending"
      }
    })
    .eq("id", oauthRequest.id);

  if (updateError) {
    return jsonResponse({ error: "OAuth request update failed", detail: updateError.message }, 500);
  }

  return jsonResponse({
    ok: true,
    provider: oauthRequest.provider,
    integration_type: oauthRequest.integration_type,
    status: "exchange_pending",
    authorization_code_stored: false,
    token_exchange: "pending_server_side"
  });
});
