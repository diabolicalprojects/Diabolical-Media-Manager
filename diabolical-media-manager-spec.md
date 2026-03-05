# DIABOLICAL MEDIA MANAGER -- AI AGENT BUILD SPEC v1

Theme: Black & White UI only

Primary colors: - #000000 (black) - #FFFFFF (white) - Grayscale only for
UI elements

This document defines the full technical specification for building the
**Diabolical Media Manager**, an internal image management and CDN
system.

The system will run on a VPS and integrate with **Dokploy MCP**, which
is already connected and will be used for deployment and environment
management.

------------------------------------------------------------------------

# 1. System Overview

Diabolical Media Manager is an internal platform designed to:

-   Manage images for multiple clients
-   Organize images by client, project, and domain
-   Automatically optimize images
-   Detect duplicates
-   Serve images through a dynamic CDN
-   Allow team members to upload and manage assets

The system is NOT intended to be a public SaaS product. It is a private
tool used internally by the Diabolical Services team.

------------------------------------------------------------------------

# 2. Technology Stack

## Backend

-   Node.js
-   Express
-   Sharp (image processing)
-   PostgreSQL

## Frontend

-   Next.js
-   TailwindCSS

## Infrastructure

-   VPS server
-   Nginx reverse proxy
-   Dokploy deployment
-   Dokploy MCP integration

------------------------------------------------------------------------

# 3. System Architecture

Internet

↓

Nginx Reverse Proxy

↓

media.diabolicalservices.tech → Next.js Admin Panel

api.diabolicalservices.tech → Node.js API

cdn.diabolicalservices.tech → Image Server

↓

PostgreSQL Database

↓

File Storage

------------------------------------------------------------------------

# 4. Server Directory Structure

/var/www/media-manager

apps/ - api/ - frontend/ - image-server/

storage/ - clients/ - cache/

logs/ scripts/

------------------------------------------------------------------------

# 5. Image Storage Structure

/storage/clients

/client-slug

/domain

/original /optimized

Example:

/storage/clients/famux/famux.com.mx/original
/storage/clients/famux/famux.com.mx/optimized

------------------------------------------------------------------------

# 6. Image Upload Flow

User uploads image

→ Server calculates SHA256 hash

→ Check database for duplicate

→ If duplicate exists notify user

→ Save original

→ Run optimization pipeline

→ Generate optimized formats

→ Store metadata in database

------------------------------------------------------------------------

# 7. Image Optimization Pipeline

Sharp generates:

-   WebP version
-   AVIF version

Responsive sizes:

-   1920
-   1280
-   768
-   480

Example generated files:

hero-banner.webp\
hero-banner.avif\
hero-banner-1920.webp\
hero-banner-1280.webp\
hero-banner-768.webp\
hero-banner-480.webp

------------------------------------------------------------------------

# 8. Dynamic CDN System

Example URLs:

cdn.diabolicalservices.tech/famux/blog/banner.webp

Resize:

cdn.diabolicalservices.tech/famux/blog/banner.webp?w=600

Format conversion:

cdn.diabolicalservices.tech/famux/blog/banner.jpg?format=webp

Processing flow:

Request → Cache Check → Generate if needed → Store Cache → Serve

------------------------------------------------------------------------

# 9. CDN Cache System

/storage/cache

Example:

banner-w600.webp

Flow:

Request → Check Cache → Generate if needed → Save → Serve

------------------------------------------------------------------------

# 10. Database Schema

## Users

id\
name\
email\
password_hash\
role\
created_at

## Clients

id\
name\
slug\
created_at

## Projects

id\
client_id\
name\
slug\
created_at

## Domains

id\
project_id\
domain\
created_at

## Images

id\
client_id\
project_id\
domain_id\
filename\
slug\
path\
hash\
size\
width\
height\
format\
created_at

## Tags

id\
name

## Image_Tags

image_id\
tag_id

------------------------------------------------------------------------

# 11. Duplicate Detection

Each uploaded image generates a SHA256 hash.

If hash already exists → system flags duplicate.

Options: - Use existing image - Upload anyway

------------------------------------------------------------------------

# 12. Admin Panel Features

Dashboard\
Clients\
Projects\
Domains\
Media Library\
Upload Manager\
Search\
Users

------------------------------------------------------------------------

# 13. Media Library UI

Gallery-style interface.

Features:

-   Image preview
-   Metadata view
-   Copy CDN URL
-   Tag images
-   Delete images

------------------------------------------------------------------------

# 14. Image Upload System

Features:

-   Drag & drop upload
-   Multiple file upload
-   Upload progress bar
-   Duplicate detection
-   Preview before upload

------------------------------------------------------------------------

# 15. API Endpoints

POST /api/images/upload

GET /api/images

DELETE /api/images/:id

GET /api/images/search?q=

GET /api/clients

POST /api/clients

GET /api/projects

POST /api/projects

------------------------------------------------------------------------

# 16. Authentication

JWT Authentication

Roles:

Admin\
Editor\
Viewer

Permissions:

Admin: - manage users - delete images - manage clients

Editor: - upload images - edit metadata

Viewer: - view library - copy URLs

------------------------------------------------------------------------

# 17. Performance

Nginx headers:

Cache-Control: public, max-age=31536000

Enable:

-   gzip
-   brotli

------------------------------------------------------------------------

# 18. Dokploy Integration

Deployment managed via Dokploy.

AI agent must:

-   Use existing Dokploy MCP connection
-   Deploy API
-   Deploy Next.js frontend
-   Deploy image server
-   Configure PostgreSQL

Services should run in containers with environment variables managed by
Dokploy.

------------------------------------------------------------------------

# 19. Repository Structure

/media-manager

frontend/\
api/\
image-server/\
database/\
migrations/\
scripts/\
docs/

------------------------------------------------------------------------

# 20. Development Phases

## Phase 1

Project structure\
API setup\
Database schema\
Image upload

## Phase 2

Client/project management\
Media library UI\
Authentication

## Phase 3

Image optimization pipeline\
WebP + AVIF\
Responsive sizes

## Phase 4

Dynamic CDN server\
URL resizing\
Cache system

## Phase 5

Duplicate detection\
Search system\
Tagging

------------------------------------------------------------------------

END OF SPECIFICATION
