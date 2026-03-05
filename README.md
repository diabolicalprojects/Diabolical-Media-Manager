# Diabolical Media Manager

Internal image management and CDN system for Diabolical Services.

## Architecture

```
Internet
  ↓
Nginx Reverse Proxy
  ↓
media.diabolicalservices.tech → Next.js Admin Panel (port 3000)
api.diabolicalservices.tech   → Node.js API (port 4000)
cdn.diabolicalservices.tech   → Image Server (port 4002)
  ↓
PostgreSQL Database
  ↓
File Storage (/storage)
```

## Project Structure

```
├── api/                 # Express API server
├── frontend/            # Next.js admin panel
├── image-server/        # CDN image server
├── database/            # Migrations and seeds
├── scripts/             # Utility scripts
└── docs/                # Documentation
```

## Quick Start (Local Development)

### 1. Database

Start a PostgreSQL database locally or use the Dokploy-managed one.

### 2. API Server

```bash
cd api
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run migrate   # Run migrations
npm run seed      # Create default admin user
npm run dev       # Start API on port 4000
```

### 3. CDN Server

```bash
cd image-server
cp .env.example .env
npm install
npm run dev       # Start CDN on port 4002
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev       # Start frontend on port 3000
```

### Default Admin Credentials

- **Email:** admin@diabolicalservices.tech
- **Password:** admin123

> ⚠️ Change these credentials after first login!

## Deployment

All services are deployed via **Dokploy MCP** to the VPS.

- **Project:** Diabolical Media Manager
- **Database:** PostgreSQL (media_manager)
- **API:** media-manager-api
- **Frontend:** media-manager-frontend
- **CDN:** media-manager-cdn

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | - | Login |
| POST | /api/auth/register | - | Register |
| GET | /api/clients | ✓ | List clients |
| POST | /api/clients | Admin | Create client |
| GET | /api/projects | ✓ | List projects |
| POST | /api/projects | Admin/Editor | Create project |
| GET | /api/domains | ✓ | List domains |
| POST | /api/domains | Admin/Editor | Create domain |
| POST | /api/images/upload | Admin/Editor | Upload images |
| GET | /api/images | ✓ | List images |
| GET | /api/images/search | ✓ | Search images |
| DELETE | /api/images/:id | Admin | Delete image |
| GET | /api/tags | ✓ | List tags |
| GET | /api/users | Admin | List users |

## CDN Usage

```
# Direct image
cdn.diabolicalservices.tech/famux/banner.webp

# With resize
cdn.diabolicalservices.tech/famux/banner.webp?w=600

# With format conversion
cdn.diabolicalservices.tech/famux/banner.jpg?format=webp

# With quality
cdn.diabolicalservices.tech/famux/banner.webp?w=600&q=90
```

## Theme

**Black & White only.** No colors allowed in the UI.

- Primary: `#000000` (Black)
- Secondary: `#FFFFFF` (White)  
- UI: Grayscale only
