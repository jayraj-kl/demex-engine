# Search Engine Project

A modern web search engine with a crawler backend and a Next.js frontend. This project consists of two main components:

1. **crawler** - A TypeScript-based web crawler and indexer
2. **demex** - A Next.js frontend search interface with modern UI components

## Project Structure

```
search-engine/
├── crawler/           # Backend crawler and indexer service
├── demex/             # Next.js frontend search interface
└── docker-compose.yml # Database configuration
```

## Components

### Crawler

The crawler service is responsible for:

- Crawling websites according to robots.txt rules
- Indexing content for search functionality
- Storing data in a PostgreSQL database

Key technologies:

- TypeScript
- Drizzle ORM
- Node.js
- PostgreSQL

### Demex (Frontend)

The frontend search interface provides:

- Modern, responsive search UI
- Real-time search results
- Animated components and modern design elements

Key technologies:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Drizzle ORM

## Setup Instructions

### Prerequisites

- Node.js (v18.x or higher)
- PNPM package manager
- Docker and Docker Compose
- Git

### Step 1: Clone the Repository

```powershell
git clone <repository-url>
cd search-engine
```

### Step 2: Start the Database

```powershell
docker-compose up -d
```

This will start a PostgreSQL database accessible at port 5433.

### Step 3: Set Up the Crawler

```powershell
cd crawler
pnpm install
```

Generate and apply database migrations:

```powershell
npx drizzle-kit generate
npx drizzle-kit migrate
```

Run the crawler in development mode:

```powershell
pnpm dev
```

Or for production:

```powershell
pnpm build
pnpm start
```

Alternatively, use the provided PowerShell script:

```powershell
./start.ps1
```

### Step 4: Set Up the Frontend

```powershell
cd ../demex
pnpm install
```

Apply database migrations:

```powershell
npx drizzle-kit generate
npx drizzle-kit migrate
```

Run the development server:

```powershell
pnpm dev
```

Access the search interface at: http://localhost:3000

## Environment Configuration

Create `.env` files in both the crawler and demex directories with the following settings:

### Crawler (.env)

```
DATABASE_URL=postgres://myuser:mypassword@localhost:5433/mydb
```

### Demex (.env.local)

```
DATABASE_URL=postgres://myuser:mypassword@localhost:5433/mydb
```

## Development Workflow

1. Run the crawler to populate the database with indexed content
2. Develop/run the frontend to access the search functionality
3. Make changes to the schema using Drizzle ORM and generate migrations as needed

## Deployment

### Crawler

The crawler can be deployed as a standalone Node.js service or as a Cloudflare Worker:

```powershell
cd crawler
pnpm deploy
```

### Frontend

The Next.js frontend can be deployed to Vercel or other hosting services:

```powershell
cd demex
pnpm build
```

Follow platform-specific deployment instructions for your hosting provider
