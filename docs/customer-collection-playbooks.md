# Customer Collection Playbooks

`v3.9.0 - Provider token exchange foundation`

Customer collection playbooks make Collectra behave less like a generic invoice list and more like a money operations desk that remembers how each account pays.

## What Changed

- New Supabase table: `customer_collection_playbooks`
- One active playbook can be attached to each workspace customer
- Seeded demo workspaces now create four customer playbooks
- Workspace bundles load playbooks into the platform UI
- Collection risk scoring applies playbook risk weight and preferred channel
- Next-best actions can switch to phone, WhatsApp, manual review, or owner review
- AI follow-up generation receives playbook behavior, tone, escalation, and notes
- Static GitHub Pages demo shows playbook context on customer and risk cards

## Playbook Fields

- `payment_behavior`: `standard`, `reliable`, `seasonal`, `slow_payer`, `dispute_prone`, or `new_account`
- `preferred_channel`: `email`, `whatsapp`, `phone`, or `manual`
- `reminder_tone`: `friendly`, `firm`, or `urgent`
- `escalation_policy`: `standard`, `high_touch`, `owner_review`, or `hold`
- `risk_weight`: numeric adjustment from `-20` to `30`
- `days_before_due`: reminder timing from `0` to `30`
- `notes`: internal context for finance and AI drafting

## Security Notes

Playbooks are internal guidance. The Edge Function tells AI not to disclose internal risk scores or policy names to customers. The table uses workspace RLS and follows the same membership model as customers, invoices, and owner profiles.

## Product Direction

This creates the foundation for future customer-level policies:

- auto-selecting channel before queueing a draft
- customer-specific escalation ladders
- accounting-system payment history enrichment
- playbook suggestions from past collection outcomes
