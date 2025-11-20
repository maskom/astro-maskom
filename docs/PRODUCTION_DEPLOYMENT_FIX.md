# Production Deployment Emergency Fix

## Issue Summary
Production deployments were failing with HTTP 500 errors due to missing Supabase environment variables in Cloudflare Pages.

## Root Cause
The application code expects `SUPABASE_URL` and `SUPABASE_KEY` environment variables, but these were not configured in the Cloudflare Pages environment, only in GitHub Secrets.

## Solution Applied

### 1. Automated Fix Script
Created `scripts/fix-production-env.sh` that:
- Validates required environment variables
- Configures Cloudflare Pages environment variables using wrangler CLI
- Sets up all required Supabase and application configuration
- Verifies KV namespace binding

### 2. Verification Script
Created `scripts/verify-deployment.sh` that:
- Tests the health check endpoint
- Verifies main site accessibility
- Checks API endpoint functionality
- Provides detailed troubleshooting information

### 3. Updated Documentation
- Enhanced `docs/DEPLOYMENT.md` with clear environment variable setup instructions
- Added troubleshooting section for common deployment issues
- Included both automated and manual configuration methods

### 4. Added NPM Scripts
- `npm run deploy:fix-env` - Run the environment fix script
- `npm run deploy:verify:prod` - Verify production deployment
- `npm run health:check` - Quick health check

## Usage

### To Fix Environment Variables:
```bash
# Set required environment variables
export CLOUDFLARE_API_TOKEN=your_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_anon_key
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the fix script
npm run deploy:fix-env
```

### To Verify Deployment:
```bash
# Verify production deployment
npm run deploy:verify:prod

# Quick health check
npm run health:check
```

## Environment Variables Required

### Supabase Configuration
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional)

### Application Configuration
- `NODE_ENV`: Set to "production"
- `SITE_URL`: Production site URL
- `LOG_LEVEL`: Set to "info"

## Verification
After applying the fix:
1. Health check endpoint should return HTTP 200: https://astro-maskom.pages.dev/api/health
2. Main site should load correctly: https://astro-maskom.pages.dev
3. All API endpoints should respond without 500 errors

## Prevention
To prevent this issue in the future:
1. Include environment variable setup in deployment documentation
2. Add environment variable validation to CI/CD pipeline
3. Use the verification script after each deployment
4. Monitor health check endpoint for early detection

## Files Modified
- `scripts/fix-production-env.sh` - New automated fix script
- `scripts/verify-deployment.sh` - New verification script
- `docs/DEPLOYMENT.md` - Updated with environment variable instructions
- `package.json` - Added new NPM scripts

## Related Issues
- Fixes #355: Production deployments failing with 500 errors - missing environment variables