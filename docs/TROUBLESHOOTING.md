# Troubleshooting Guide

This guide covers common issues and their solutions for the Astro Maskom development environment.

## 🚨 Critical Issues (November 2025)

### TypeScript Configuration Crisis

**Issue**: #302 - TypeScript compilation fails with configuration errors

**Symptoms**:
```bash
error TS2688: Cannot find type definition file for 'node'
error TS5083: Cannot read file './node_modules/astro/tsconfigs/base.json'
```

**Solutions**:

#### 1. Fix TypeScript Configuration
```bash
# Update tsconfig.json extends path
# From: "./node_modules/astro/tsconfigs/base.json"
# To: "@astrojs/tsconfig/base" or correct path
```

#### 2. Install Missing Types
```bash
npm install --save-dev @types/node
```

#### 3. Fix Dependency Resolution
```bash
# Clean and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 4. Verify Configuration
```bash
npm run typecheck  # Should pass after fixes
npm run lint      # Should work without errors
```

**See**: Issue #302 for complete implementation plan.

---

## 🔧 Development Environment Issues

### Dependencies Not Installed

**Symptoms**:
```bash
npm outdated shows all dependencies as "MISSING"
```

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm ls --depth=0
```

### ESLint Not Found

**Symptoms**:
```bash
npm run lint
sh: 1: eslint: not found
```

**Solution**:
```bash
# Verify ESLint installation
npm list eslint

# Reinstall if missing
npm install --save-dev eslint

# Check configuration
npx eslint --version
```

### Port Already in Use

**Symptoms**:
```bash
Error: listen EADDRINUSE: address already in use :::4321
```

**Solutions**:

#### Option 1: Kill Process
```bash
# Find process on port 4321
lsof -ti:4321

# Kill process
lsof -ti:4321 | xargs kill -9
```

#### Option 2: Use Different Port
```bash
npm run dev -- --port 3000
```

---

## 🗄️ Database Issues

### Supabase Connection Failed

**Symptoms**:
```bash
Error: Invalid Supabase credentials
Error: Could not connect to Supabase
```

**Solutions**:

#### 1. Verify Environment Variables
```bash
# Check .env file
cat .env | grep SUPABASE
```

Required variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 2. Test Connection
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/
```

#### 3. Check Project Status
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Verify project is active
- Check API keys are correct

### Row Level Security (RLS) Issues

**Symptoms**:
```bash
Error: permission denied for table
Error: no RLS policies enabled
```

**Solutions**:

#### 1. Enable RLS on Tables
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

#### 2. Create Policies
```sql
-- Example policy for users table
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

#### 3. Verify Policies
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## 🔐 Authentication Issues

### Invalid JWT Token

**Symptoms**:
```bash
Error: Invalid JWT token
Error: Token has expired
```

**Solutions**:

#### 1. Check Token Format
```bash
# JWT should have 3 parts separated by dots
echo $JWT_TOKEN | grep -o '\.' | wc -l
# Should return: 2
```

#### 2. Verify Token Expiration
```bash
# Decode JWT (requires jq)
echo $JWT_TOKEN | cut -d. -f2 | base64 -d | jq .exp
```

#### 3. Refresh Token
```bash
# Use refresh token to get new access token
curl -X POST /api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

### MFA Verification Issues

**Symptoms**:
```bash
Error: Invalid MFA code
Error: MFA not enabled for user
```

**Solutions**:

#### 1. Check MFA Status
```sql
-- Check if MFA is enabled for user
SELECT * FROM auth.mfa_factors WHERE user_id = 'user_uuid';
```

#### 2. Verify Code Format
```bash
# MFA codes should be 6 digits
echo "123456" | grep -E '^[0-9]{6}$'
```

---

## 🌐 Network & API Issues

### API Rate Limiting

**Symptoms**:
```bash
Error: Rate limit exceeded
HTTP 429 Too Many Requests
```

**Solutions**:

#### 1. Check Rate Limit Headers
```bash
curl -I /api/your-endpoint
# Look for:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1640995200
```

#### 2. Wait and Retry
```bash
# Calculate wait time
current_time=$(date +%s)
reset_time=1640995200
wait_time=$((reset_time - current_time))

echo "Wait $wait_time seconds before retrying"
```

### CORS Issues

**Symptoms**:
```bash
Error: CORS policy violation
Access-Control-Allow-Origin missing
```

**Solutions**:

#### 1. Check CORS Configuration
```bash
# Verify CORS_ORIGIN in .env
cat .env | grep CORS_ORIGIN
```

#### 2. Update CORS Settings
```env
# In .env file
CORS_ORIGIN=http://localhost:4321,https://yourdomain.com
```

---

## 🎨 Frontend Issues

### Tailwind CSS Not Working

**Symptoms**:
- Styles not applied
- Classes not recognized
- Build warnings about Tailwind

**Solutions**:

#### 1. Check Tailwind Configuration
```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    plugins: [tailwind()],
  },
});
```

#### 2. Verify Tailwind Version
```bash
npm list tailwindcss
# Should be v4.x for current setup
```

#### 3. Rebuild CSS
```bash
# Clear Astro cache
rm -rf .astro/

# Rebuild
npm run build
```

### Astro Component Errors

**Symptoms**:
```bash
Error: Unexpected token in Astro component
Error: Invalid Astro syntax
```

**Solutions**:

#### 1. Check Component Syntax
```astro
---
// Frontmatter must be at top
import { SomeComponent } from './SomeComponent.astro';

const variable = 'value';
---

<!-- HTML template below -->
<div>{variable}</div>
```

#### 2. Verify Imports
```bash
# Check import paths
grep -r "import from" src/components/
```

---

## 📊 Performance Issues

### Slow Development Server

**Symptoms**:
- Long startup times
- Slow hot reload
- High memory usage

**Solutions**:

#### 1. Increase Node.js Memory
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

#### 2. Optimize File Watching
```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
    },
  },
});
```

#### 3. Disable Unused Integrations
```javascript
// Remove unused integrations from astro.config.mjs
export default defineConfig({
  integrations: [
    // Keep only what you use
    icon(),
    sitemap(),
  ],
});
```

### Build Performance Issues

**Symptoms**:
- Long build times
- Large bundle sizes
- Memory errors during build

**Solutions**:

#### 1. Analyze Bundle Size
```bash
# Add bundle analyzer
npm install --save-dev @rollup/plugin-bundle-size

# Check bundle size
npm run build
```

#### 2. Optimize Imports
```bash
# Check for unused imports
npx ts-unused-exports tsconfig.json
```

---

## 🧪 Testing Issues

### Test Failures

**Symptoms**:
```bash
npm run test
FAIL: Test suite failed
```

**Solutions**:

#### 1. Check Test Configuration
```bash
# Verify vitest config
cat vitest.config.ts
```

#### 2. Run Tests Verbosely
```bash
npm run test -- --reporter=verbose
```

#### 3. Run Specific Test
```bash
npm run test path/to/specific.test.ts
```

### Coverage Issues

**Symptoms**:
- Low coverage percentages
- Coverage not generating

**Solutions**:

#### 1. Check Coverage Configuration
```bash
# Verify coverage settings in vitest.config.ts
grep -A 10 "coverage:" vitest.config.ts
```

#### 2. Generate Coverage Report
```bash
npm run test:coverage
```

---

## 📱 Mobile Development Issues

### Local Network Access

**Symptoms**:
- Cannot access dev server from mobile
- Connection refused errors

**Solutions**:

#### 1. Find Local IP
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr "IPv4"
```

#### 2. Start with Host Binding
```bash
npm run dev -- --host
```

#### 3. Access from Mobile
```bash
# Use your local IP
http://YOUR_IP:4321
```

---

## 🚀 Deployment Issues

### Build Failures

**Symptoms**:
```bash
npm run build
Error: Build failed
```

**Solutions**:

#### 1. Check Environment Variables
```bash
# Verify all required variables are set
npm run build 2>&1 | grep -i "missing\|undefined"
```

#### 2. Clear Build Cache
```bash
rm -rf .astro/ dist/
npm run build
```

#### 3. Check Dependencies
```bash
npm audit
npm audit fix
```

### Deployment Verification

**Symptoms**:
- Deployed site not working
- API endpoints returning errors

**Solutions**:

#### 1. Check Health Endpoint
```bash
curl https://your-domain.com/api/health
```

#### 2. Verify Environment
```bash
# Check deployment environment
curl https://your-domain.com/api/health | jq .environment
```

#### 3. Review Deployment Logs
```bash
# Check deployment platform logs
# Cloudflare Pages, Vercel, Netlify, etc.
```

---

## 🆘 Getting Help

### Create an Issue

If you encounter a problem not covered here:

1. **Search Existing Issues**: Check if the problem is already reported
2. **Create New Issue**: Include:
   - Error messages (full output)
   - Steps to reproduce
   - Environment details (OS, Node.js version, browser)
   - What you've tried

### Debug Information Collection

```bash
# Collect system information
echo "=== System Info ==="
uname -a
node --version
npm --version

echo "=== Project Info ==="
pwd
git status
npm list --depth=0

echo "=== Build Test ==="
npm run typecheck 2>&1 | head -20
npm run lint 2>&1 | head -20
```

### Contact Information

- **GitHub Issues**: [Create new issue](https://github.com/maskom/astro-maskom/issues)
- **Documentation**: Check other docs in `/docs` folder
- **Community**: Post in discussions for general questions

---

**Last Updated**: 2025-11-19  
**Next Review**: 2025-11-26  
**Maintainer**: Development Team