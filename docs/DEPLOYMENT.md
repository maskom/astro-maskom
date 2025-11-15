# Deployment Pipeline Documentation

## Overview

This document describes the automated deployment pipeline for the Maskom Network website using GitHub Actions and Cloudflare Pages.

## Architecture

The deployment pipeline consists of the following stages:

1. **Quality Checks** - Linting, type checking, tests, and security audit
2. **Build** - Compile the Astro application
3. **Deploy to Staging** - Deploy to staging environment
4. **Deploy to Production** - Deploy to production environment (after staging succeeds)
5. **Health Checks** - Verify deployment success

## Environments

### Staging
- **URL**: `https://astro-maskom-staging.pages.dev`
- **Purpose**: Testing and validation before production
- **Trigger**: Every push to main branch
- **Features**: Limited feature set for testing

### Production
- **URL**: `https://maskom.co.id`
- **Purpose**: Live production environment
- **Trigger**: Manual approval after successful staging deployment
- **Features**: Full feature set enabled

## Deployment Triggers

### Automatic Deployment
- Push to `main` branch triggers the full pipeline
- Staging deploys automatically
- Production requires manual approval

### Manual Deployment
- Use GitHub Actions "Run workflow" button
- Choose target environment (staging/production)
- Useful for hotfixes and emergency deployments

### Rollback
- Manual trigger available for emergency rollbacks
- Returns to previous successful deployment
- Should only be used in emergency situations

## Environment Configuration

### Required Secrets

Configure these secrets in your GitHub repository settings:

#### Cloudflare
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages permissions

#### Supabase
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### Application
- `SECURITY_WEBHOOK_SECRET` - Security webhook secret
- `STRIPE_SECRET_KEY` - Stripe secret key (production only)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (production only)
- `SENDGRID_API_KEY` - SendGrid API key (production only)

### Environment Files

Copy and configure these files for local development:

```bash
# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

## Quality Gates

The pipeline includes several quality checks:

### Pre-deployment Checks
- **Linting**: ESLint validation
- **Type Checking**: TypeScript compilation
- **Tests**: Unit and integration tests
- **Security Audit**: Dependency vulnerability scan
- **Build Verification**: Successful application build

### Health Checks
- **API Status**: `/api/status` endpoint verification
- **Service Connectivity**: Supabase connection test
- **Feature Validation**: Critical feature availability

## Deployment Commands

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run quality checks
npm run ci
```

### Manual Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Deploy to preview
npm run deploy:preview
```

## Monitoring and Notifications

### Deployment Status
- GitHub commit status indicators
- Environment-specific deployment URLs
- Health check results

### Error Handling
- Automatic rollback on health check failure
- Detailed error logging
- Notification system integration

## Troubleshooting

### Common Issues

#### Build Failures
- Check dependency versions in `package.json`
- Verify environment variables
- Review build logs in GitHub Actions

#### Deployment Failures
- Verify Cloudflare credentials
- Check project configuration
- Review deployment logs

#### Health Check Failures
- Verify Supabase connectivity
- Check API endpoint availability
- Review service configuration

### Debug Commands

```bash
# Check build output
ls -la dist/

# Test locally
npm run preview

# Verify environment
npm run pages:dev
```

## Security Considerations

- All secrets stored in GitHub Secrets
- Environment-specific configurations
- Security headers automatically applied
- Regular dependency audits
- HTTPS enforcement in production

## Performance Optimizations

- Automatic asset optimization
- CDN distribution via Cloudflare
- Build-time optimizations
- Caching headers configuration

## Rollback Procedures

### Automatic Rollback
- Triggered by health check failures
- Returns to previous stable version
- Maintains service availability

### Manual Rollback
1. Go to GitHub Actions
2. Select "Deploy to Cloudflare Pages" workflow
3. Click "Run workflow"
4. Choose "rollback" as environment
5. Confirm rollback operation

## Best Practices

1. **Test in Staging**: Always validate changes in staging first
2. **Monitor Deployments**: Watch deployment status and health checks
3. **Keep Secrets Secure**: Never commit secrets to repository
4. **Document Changes**: Update documentation for significant changes
5. **Regular Updates**: Keep dependencies and tools updated

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Contact the DevOps team
4. Create an issue with detailed error information