# Environment Setup Guide

This guide covers setting up the development environment for Astro Maskom, including all required dependencies, environment variables, and configuration steps.

## 📋 Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or yarn 1.22.0+)
- **Git**: 2.30.0 or higher
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Recommended Tools

- **VS Code**: With Astro and TypeScript extensions
- **Postman**: For API testing
- **Supabase CLI**: For database management

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/maskom/astro-maskom.git
cd astro-maskom
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:4321` to see the application.

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Configuration
SITE_URL=http://localhost:4321
NODE_ENV=development

# Payment Gateway (Midtrans)
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_ENVIRONMENT=sandbox
MIDTRANS_MERCHANT_ID=your_merchant_id
```

### Optional Variables

```env
# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Social Media
WHATSAPP_NUMBER=628123456789
FACEBOOK_URL=https://facebook.com/maskom
TWITTER_URL=https://twitter.com/maskom

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

## 📊 Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 2. Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packages table
CREATE TABLE packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'soho', 'corporate')),
  price DECIMAL(10,2) NOT NULL,
  features JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Public can view packages" ON packages
  FOR SELECT USING (true);
```

### 3. Authentication Setup

1. Go to Authentication > Settings
2. Configure your site URL: `http://localhost:4321`
3. Enable email/password authentication
4. Configure redirect URLs as needed

## 🤖 OpenAI Setup (Optional)

For chatbot functionality:

### 1. Create OpenAI Account

1. Go to [openai.com](https://openai.com)
2. Create an account and add payment method
3. Generate an API key

### 2. Configure API Key

Add to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ORG_ID=org-your-org-id-here
```

## 🛠️ Development Tools

### VS Code Extensions

Install these extensions for optimal development:

- **Astro** - Astro language support
- **TypeScript** - TypeScript support
- **Tailwind CSS IntelliSense** - Tailwind class suggestions
- **ESLint** - Code linting
- **Prettier** - Code formatting

### Git Hooks (Optional)

Install husky for pre-commit hooks:

```bash
npm install --save-dev husky lint-staged
npx husky install
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{js,ts,astro}": ["eslint --fix", "prettier --write"]
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### "Dependencies not installed"

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

#### "Supabase connection failed"

1. Verify your `.env` variables are correct
2. Check Supabase project status
3. Ensure API keys have proper permissions
4. Test connection with curl:

```bash
curl https://your-project.supabase.co/rest/v1/
```

#### "TypeScript errors"

```bash
# Check TypeScript version
npx tsc --version

# Rebuild TypeScript
npx tsc --noEmit

# Clear TypeScript cache
rm -rf .astro/
```

#### "Port already in use"

```bash
# Kill process on port 4321
lsof -ti:4321 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### Performance Issues

#### Slow development server

1. Increase Node.js memory limit:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

2. Disable file watching for large folders:
   Add to `astro.config.mjs`:

```javascript
vite: {
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'];
    }
  }
}
```

## 📱 Mobile Development

### Testing on Mobile

1. Ensure your mobile device is on the same network
2. Find your local IP address:

```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

3. Start dev server with host binding:

```bash
npm run dev -- --host
```

4. Access via `http://YOUR_IP:4321` on mobile device

## 🚀 Deployment Preparation

### Environment-Specific Variables

Create different `.env` files for each environment:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Build Verification

```bash
# Test build process
npm run build

# Preview production build
npm run preview

# Verify deployment health
npm run deploy:verify
```

## 🔍 Health Check Endpoint

The application includes a comprehensive health check endpoint at `/api/health` that monitors:

- **Application Status**: Overall health and uptime
- **Supabase Connectivity**: Database connection and latency
- **Cloudflare Services**: Active features and status
- **Response Times**: Performance metrics

### Usage

```bash
# Check health locally
curl http://localhost:4321/api/health

# Check production health
curl https://astro-maskom.pages.dev/api/health
```

### Response Format

```json
{
  "status": "healthy|degraded",
  "timestamp": "2025-11-17T16:32:04.854Z",
  "uptime": 3600,
  "environment": "production",
  "version": "0.0.1",
  "responseTime": 45,
  "services": {
    "supabase": {
      "status": "healthy|error|skipped",
      "latency": 23,
      "error": null
    },
    "cloudflare": {
      "status": "active",
      "features": ["pages", "kv", "functions"]
    }
  }
}
```

### Status Codes

- **200**: Application is healthy
- **503**: Application is degraded (e.g., missing environment variables)

### Monitoring Integration

The health endpoint can be integrated with monitoring tools:

```bash
# Simple monitoring script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" https://astro-maskom.pages.dev/api/health)
if [ $response -eq 200 ] || [ $response -eq 503 ]; then
  echo "✅ Application is accessible"
else
  echo "❌ Application is down"
  exit 1
fi
```

## 📚 Additional Resources

- [Astro Documentation](https://docs.astro.build)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

For additional help, create an issue in the repository or contact the development team.

_Last Updated: 2025-11-14_
