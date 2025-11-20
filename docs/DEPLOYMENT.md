# Deployment Environment Configuration

This document outlines the required environment variables and secrets for the deployment pipeline.

## Required GitHub Secrets

### Cloudflare Configuration
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Optional Secrets
- `GH_TOKEN`: GitHub token for enhanced API access (automatically provided by GitHub Actions)

## Environment Variables

### Required Environment Variables

The application requires these environment variables to be configured in Cloudflare Pages:

#### Supabase Configuration (Required)
- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_KEY`: Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for admin operations)

#### Application Configuration (Required)
- `NODE_ENV`: Set to "production" for production deployments
- `SITE_URL`: The production site URL (e.g., `https://astro-maskom.pages.dev`)
- `LOG_LEVEL`: Set to "info" for production logging

### Staging Environment
- `NODE_ENV`: Set to "staging"
- `SUPABASE_URL`: Supabase project URL for staging
- `SUPABASE_KEY`: Supabase anonymous key for staging

### Production Environment  
- `NODE_ENV`: Set to "production"
- `SUPABASE_URL`: Supabase project URL for production
- `SUPABASE_KEY`: Supabase anonymous key for production
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for production

## Cloudflare Projects

The deployment pipeline expects these Cloudflare Pages projects:
- `astro-maskom`: Production environment
- `astro-maskom-staging`: Staging environment (for PR previews)
- `astro-maskom-preview`: Optional preview environment

## Deployment Process

### Automatic Deployments
1. **Pull Requests**: Automatically deploy to staging environment
2. **Main Branch**: Automatically deploy to production environment
3. **Manual**: Trigger deployment via GitHub Actions UI

### Pre-deployment Checks
All deployments run these checks first:
- ESLint validation
- TypeScript type checking  
- Unit tests execution
- Application build

### Health Checks
After deployment, the pipeline:
- Waits for deployment to propagate (30s for staging, 60s for production)
- Performs HTTP health check on the deployed URL
- Fails deployment if health check fails

### Rollback Process
Manual rollback can be triggered via GitHub Actions:
1. Go to Actions → Deploy to Cloudflare
2. Click "Run workflow"
3. Select "rollback" as environment
4. Pipeline will deploy the previous successful commit

## Zero-Downtime Deployment

Cloudflare Pages provides zero-downtime deployments by:
- Building new version while old version serves traffic
- Instant atomic switch when deployment is ready
- Global CDN ensures immediate propagation

## Monitoring and Notifications

### Deployment Status
- PR comments for staging deployments
- GitHub deployment status for production
- Optional integration with external notification systems

### Health Monitoring
- Automated health checks after each deployment
- Failed deployments create GitHub issues for tracking
- Rollback capabilities for quick recovery

## Security Considerations

- All secrets are stored in GitHub Secrets (never in code)
- Environment-specific configurations are isolated
- API tokens have minimum required permissions
- Deployments use GitHub's built-in security features

## Setup Instructions

1. **Create Cloudflare Pages Projects**:
   ```bash
   # Production
   wrangler pages project create astro-maskom
   
   # Staging  
   wrangler pages project create astro-maskom-staging
   ```

2. **Configure GitHub Secrets**:
   - Go to Repository → Settings → Secrets and variables → Actions
   - Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
   - Add Supabase secrets: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

3. **Configure Cloudflare Pages Environment Variables**:
   
   **Option A: Using the automated script**
   ```bash
   # Set environment variables first
   export CLOUDFLARE_API_TOKEN=your_token
   export CLOUDFLARE_ACCOUNT_ID=your_account_id
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_KEY=your_supabase_anon_key
   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Run the fix script
   ./scripts/fix-production-env.sh
   ```
   
   **Option B: Manual configuration via Cloudflare Dashboard**
   1. Go to Cloudflare Pages dashboard
   2. Select your project (astro-maskom)
   3. Navigate to Settings → Environment variables
   4. Add the following variables:
      - `SUPABASE_URL`: Your Supabase project URL
      - `SUPABASE_KEY`: Your Supabase anon/public key
      - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
      - `NODE_ENV`: `production`
      - `SITE_URL`: `https://astro-maskom.pages.dev`
      - `LOG_LEVEL`: `info`

4. **Verify KV namespace binding**:
   - Ensure the `SESSION` KV namespace is properly bound to the Pages project
   - KV namespace ID: `e2109995612b4daea45cb0731ad33b85`

5. **Test Deployment**:
   ```bash
   # Test staging deployment
   npm run deploy:staging
   
   # Test production deployment (use with caution)
   npm run deploy:production
   ```

6. **Verify Health Checks**:
   ```bash
   # Test health check endpoint
   curl -s https://astro-maskom.pages.dev/api/health
   
   # Should return HTTP 200 with detailed health information
   ```

## Troubleshooting

### Common Issues
- **Build failures**: Check that all dependencies are installed and compatible
- **Permission errors**: Verify Cloudflare API token has correct permissions
- **Health check failures**: Ensure application builds correctly and handles requests
- **HTTP 500 errors**: Usually caused by missing environment variables, especially Supabase configuration

### Environment Variable Issues
If you're getting HTTP 500 errors, check the health endpoint:
```bash
curl -s https://astro-maskom.pages.dev/api/health | jq .
```

Look for these indicators:
- `env_check.status: "error"` - Missing required environment variables
- `env_check.missing_vars` - Lists which variables are missing
- `services.supabase.status: "error"` - Supabase client not properly configured

**Quick fix for missing environment variables:**
```bash
# Run the automated fix script
./scripts/fix-production-env.sh
```

### Debug Commands
```bash
# Check build output
npm run build

# Test locally
npm run dev

# Verify Cloudflare configuration
wrangler pages project list

# Check environment variables in production
curl -s https://astro-maskom.pages.dev/api/health | jq '.env_check'

# Test Supabase connectivity
curl -s https://astro-maskom.pages.dev/api/health | jq '.services.supabase'
```
