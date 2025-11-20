#!/bin/bash

# Fix Production Environment Variables Script
# This script configures the missing Supabase environment variables in Cloudflare Pages

set -e

echo "🔧 Fixing Production Environment Variables..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler CLI is not installed. Installing..."
    npm install -g wrangler
fi

# Check if environment variables are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    print_error "CLOUDFLARE_API_TOKEN environment variable is not set"
    echo "Please set it with: export CLOUDFLARE_API_TOKEN=your_token"
    exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    print_error "CLOUDFLARE_ACCOUNT_ID environment variable is not set"
    echo "Please set it with: export CLOUDFLARE_ACCOUNT_ID=your_account_id"
    exit 1
fi

# Check if Supabase secrets are available
if [ -z "$SUPABASE_URL" ]; then
    print_error "SUPABASE_URL environment variable is not set"
    echo "Please set it with: export SUPABASE_URL=your_supabase_url"
    exit 1
fi

if [ -z "$SUPABASE_KEY" ]; then
    print_error "SUPABASE_KEY environment variable is not set"
    echo "Please set it with: export SUPABASE_KEY=your_supabase_anon_key"
    exit 1
fi

print_status "Environment variables verified"

# List Cloudflare Pages projects
print_status "Fetching Cloudflare Pages projects..."
wrangler pages project list

# Set environment variables for the main project
PROJECT_NAME="astro-maskom"

print_status "Setting environment variables for project: $PROJECT_NAME"

# Set Supabase URL
print_status "Setting SUPABASE_URL..."
wrangler pages secret put SUPABASE_URL --project-name="$PROJECT_NAME" <<< "$SUPABASE_URL"

# Set Supabase Key
print_status "Setting SUPABASE_KEY..."
wrangler pages secret put SUPABASE_KEY --project-name="$PROJECT_NAME" <<< "$SUPABASE_KEY"

# Set Supabase Service Role Key (if available)
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_status "Setting SUPABASE_SERVICE_ROLE_KEY..."
    wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name="$PROJECT_NAME" <<< "$SUPABASE_SERVICE_ROLE_KEY"
else
    print_warning "SUPABASE_SERVICE_ROLE_KEY not available, skipping..."
fi

# Set other required environment variables
print_status "Setting additional environment variables..."

# Set NODE_ENV
wrangler pages secret put NODE_ENV --project-name="$PROJECT_NAME" <<< "production"

# Set SITE_URL
SITE_URL=${SITE_URL:-"https://astro-maskom.pages.dev"}
wrangler pages secret put SITE_URL --project-name="$PROJECT_NAME" <<< "$SITE_URL"

# Set LOG_LEVEL
wrangler pages secret put LOG_LEVEL --project-name="$PROJECT_NAME" <<< "info"

print_status "Environment variables configured successfully!"

# Verify KV namespace binding
print_status "Verifying KV namespace binding..."
KV_NAMESPACE_ID="e2109995612b4daea45cb0731ad33b85"

# Check if KV namespace exists
print_status "Checking KV namespace: $KV_NAMESPACE_ID"
wrangler kv namespace list | grep "$KV_NAMESPACE_ID" || print_warning "KV namespace not found or not accessible"

# Trigger a deployment
print_status "Triggering new deployment to test the configuration..."
echo "Note: This will require a git push to trigger the deployment pipeline"

# Test health check endpoint
print_status "After deployment, you can test the health check with:"
echo "curl -s https://astro-maskom.pages.dev/api/health"

print_status "Setup complete! The production deployment should now work correctly."
echo ""
echo "Next steps:"
echo "1. Push changes to trigger a new deployment"
echo "2. Monitor the deployment in Cloudflare Pages dashboard"
echo "3. Test the health check endpoint"
echo "4. Verify the main site loads correctly"