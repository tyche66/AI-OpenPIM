# AI OpenPIM

AI OpenPIM is an open-source product information management project with product catalogs, media assets, quotations, sharing pages, and AI-assisted workflows.

This repository is a sanitized community edition. Private deployment details, architecture documents, operating runbooks, internal review records, customer-specific sample data, credentials, keys, IDs, logs, and private environment files are not included.

## Features

- Product, category, brand, supplier, and tag management
- Product import/export and sample placeholder data
- Proposal, quotation, sharing, and permission-aware workflows
- Media library, product images, scene images, and manuals
- AI portal and AI-assisted product interaction flows
- Audit logs and basic quality views

## Quick Start

Use the example environment files as templates and replace placeholder values before running locally.

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
```

Backend, frontend, and portal dependencies are managed in their own directories.

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

```bash
cd portal
npm install
npm run dev
```

## Security

Do not commit real `.env` files, production credentials, API keys, private keys, certificates, database dumps, customer data, logs, build artifacts, or dependency directories.

Before publishing changes, run:

```bash
bash scripts/secret_scan.sh
```

## License

See `LICENSE`.
