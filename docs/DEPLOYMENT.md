# Deployment Environment Configuration

This document outlines the required environment variables and secrets for the deployment pipeline.

## Required GitHub Secrets

### Cloudflare Configuration
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages:Edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Optional Secrets
- `GH_TOKEN`: GitHub token for enhanced API access (automatically provided by GitHub Actions)

## Environment Variables

### Staging Environment
- `NODE_ENV`: Set to "staging"
- `VITE_SUPABASE_URL`: Supabase project URL for staging
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key for staging

### Production Environment  
- `NODE_ENV`: Set to "production"
- `VITE_SUPABASE_URL`: Supabase project URL for production
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key for production

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

3. **Test Deployment**:
   ```bash
   # Test staging deployment
   npm run deploy:staging
   
   # Test production deployment (use with caution)
   npm run deploy:production
   ```

4. **Verify Health Checks**:
   ```bash
   npm run health:check
   ```

## Troubleshooting

### Common Issues
- **Build failures**: Check that all dependencies are installed and compatible
- **Permission errors**: Verify Cloudflare API token has correct permissions
- **Health check failures**: Ensure application builds correctly and handles requests

### Debug Commands
```bash
# Check build output
npm run build

# Test locally
npm run dev

# Verify Cloudflare configuration
wrangler pages project list
```