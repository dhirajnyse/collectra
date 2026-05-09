# Collectra

Collectra is a B2B money operations product for small and mid-sized companies that sell through quotes, invoices, payment terms, and follow-ups.

The current version is a dependency-free browser app. Open `index.html` to use it. Data is saved in the browser with `localStorage`.

## Product Promise

Turn leads into quotes, quotes into invoices, and invoices into collected cash without losing the work across email, WhatsApp, spreadsheets, and accounting tools.

## First Wedge

B2B trading, import/export, distributors, and service businesses that already manage customers, quotes, invoices, and collections manually.

## Prototype Modules

- Cash dashboard
- Customer database
- Deal pipeline
- Quote builder
- Invoice collection board
- AI follow-up desk
- Quote and invoice PDF export
- Product blueprint in `docs/product-blueprint.md`

## Project Structure

- `index.html`: app shell and product screens
- `styles.css`: responsive product UI
- `src/data.js`: demo workspace data
- `src/storage.js`: browser persistence
- `src/pdf.js`: no-dependency PDF download helper
- `src/app.js`: app state, rendering, and interactions

## Next Build Steps

1. Add real create/edit forms for customers, deals, and invoices.
2. Add authenticated workspaces and a backend database.
3. Replace demo AI copy with an OpenAI-powered follow-up workflow.
4. Add email, WhatsApp, and accounting integrations.

## GitHub

See `docs/github-setup.md` for the recommended repository setup and first push commands.
