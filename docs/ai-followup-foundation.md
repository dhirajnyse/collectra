# AI Follow-Up Foundation

## Current Version

`v3.9.0 - Provider token exchange foundation`

## Goal

Generate invoice follow-up drafts without exposing AI secrets in the browser, while preserving workspace isolation and audit history.

## Architecture

- Browser calls `supabase.functions.invoke("generate-followup")` with the signed-in user's session.
- Supabase Edge Function validates the JWT.
- Edge Function checks `workspace_members` before reading invoice data.
- Edge Function loads the active customer collection playbook when one exists.
- OpenAI API key stays in Supabase Edge Function secrets.
- Generated draft is saved to `ai_followups`.
- Audit row is written as `ai_followup.generated`.

## Required Secrets

Set these in Supabase, not in `.env.local`:

```powershell
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set OPENAI_MODEL=your-model
```

`OPENAI_MODEL` is configurable so the product can move to newer models without changing browser code.

## Deploy Function

```powershell
cd C:\Users\dhiraj\Documents\Codex\Collectra\platform
supabase functions deploy generate-followup
```

## Local Test Path

1. Run `platform/supabase/schema.sql`.
2. Start the platform app.
3. Sign in with magic link.
4. Create or load a workspace.
5. Seed demo data.
6. Select an open invoice in **AI Desk**.
7. Confirm the selected customer playbook appears when seeded.
8. Choose a tone.
9. Generate a draft.
10. Confirm the draft appears in the approval queue.
11. Confirm `ai_followup.generated` appears in the audit trail.
12. Queue the approved draft for outbound review.
13. Send the queued email through `send-queued-email` after sender settings are active.
14. Send the queued WhatsApp message through `send-queued-whatsapp` after business phone settings are active.

## Guardrails

- Drafts are never sent automatically.
- Approved drafts move into `outbound_messages` before any provider sends them.
- Provider sending stays behind explicit user action and server-side membership checks.
- Prompt tells the model not to invent facts, bank details, legal threats, discounts, or payment commitments.
- Prompt tells the model not to disclose internal playbook policy names or risk scores.
- User must review the draft before any customer send flow is added.
- Function rejects unauthenticated requests.
- Function rejects users who are not workspace members.
- Service-role key remains server-side in the Edge Function environment.
