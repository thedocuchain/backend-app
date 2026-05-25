<h1 align="center">DocuChain backend</h1>
<p align="center">
  NestJS API for <a href="https://docuchain.io">DocuChain</a> — open-source, blockchain-anchored document signing.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white" alt="NestJS 10">
  <img src="https://img.shields.io/badge/Node-%E2%89%A5%2020-brightgreen" alt="Node 20+">
  <img src="https://img.shields.io/badge/Postgres-14%2B-336791?logo=postgresql&logoColor=white" alt="Postgres 14+">
</p>

<p align="center">
  <a href="https://docuchain.io">Website</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/thedocuchain/frontend-app">Frontend</a>
</p>

Documents are uploaded to Google Cloud Storage, hashed, and the hash is
anchored on a blockchain so that any later signature can be verified against
an immutable on-chain record. Signing workflows are coordinated over REST and
email.

## Features

- Multi-signer document workflows with email invitations and reminders
- On-chain hash anchoring across seven networks
- Encrypted document storage on Google Cloud Storage with signed-URL delivery
- JWT auth, reCAPTCHA v3 verification on public endpoints
- Mailchimp Transactional (Mandrill) for outbound email
- Swagger API docs in non-production environments
- Optional Telegram bot for ops notifications

## Supported chains

Polygon · BSC · Solana · Monad · Base · Bitcoin · Sei. Each chain has its own
private key configured via env vars; only the chains you configure are loaded
at boot.

## Quick start

Requires Node 20+, PostgreSQL 14+, and a Google Cloud Storage bucket with a
service account.

```sh
cp .env.example .env
# fill in DATABASE_PASSWORD, GCS_*, MANDRILL_*, JWT_SECRET, and at least one
# {CHAIN}_PRIVATE_KEY for the chains you intend to use
npm install
docker compose up -d db
npm run typeorm:run-migrations
npm run start:dev
```

The API listens on `PORT` (default `3000`). Swagger docs are mounted at
`/api/docs` in non-production environments.

## Configuration

All configuration is read from environment variables. See [`.env.example`](.env.example)
for the full set. Highlights:

| Variable | Purpose |
|---|---|
| `DATABASE_*` | Postgres connection |
| `GCS_*` | Google Cloud Storage service account + bucket |
| `MANDRILL_*`, `MAIL_FROM_*` | Mailchimp Transactional (Mandrill) credentials and From identity for outbound signing-request emails |
| `JWT_SECRET` | Auth token signing |
| `{CHAIN}_PRIVATE_KEY`, `{CHAIN}_RPC_NODE` | Per-chain wallet and RPC endpoint |
| `RECAPTCHA_SECRET_KEY` | Server-side recaptcha verification |
| `TG_BOT_TOKEN`, `TG_CHAT_ID` | Optional ops notifications |

Public RPC URLs are included as fallbacks in `.env.example`. For production
throughput, point each chain at a metered provider (Ankr, Alchemy, QuickNode,
etc.).

## Database migrations

```sh
npm run typeorm:run-migrations              # apply pending
npm run typeorm:generate-migration --name=descriptive_name
npm run typeorm:revert-migration            # undo last
```

In Docker:

```sh
docker exec -it backend-app npm run typeorm:run-migrations
```

## Tests

```sh
npm test            # unit
npm run test:e2e    # end-to-end
```

## Contributing

Issues and pull requests are welcome. For non-trivial changes please open an
issue first to discuss what you'd like to change. Run `npm run lint` before
submitting.

## License

[MIT](LICENSE) © DocuChain Contributors.
