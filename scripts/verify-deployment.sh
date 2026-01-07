#!/bin/bash

# Production Deployment Verification Script
# This script verifies that the production deployment is working correctly

set -e

echo "🔍 Verifying Production Deployment..."
echo "====================================="

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

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Production URL
PROD_URL="https://astro-maskom.pages.dev"
HEALTH_ENDPOINT="${PROD_URL}/api/health"

print_status "Testing production deployment at: $PROD_URL"

# Test 1: Health check endpoint
print_status "Test 1: Health check endpoint..."
HTTP_STATUS=$(curl -s -w "%{http_code}" "$HEALTH_ENDPOINT" -o /tmp/health_response.json)

if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Health check endpoint returned HTTP 200"
    
    # Parse health check response
    if command -v jq &> /dev/null; then
        print_status "Health check details:"
        OVERALL_STATUS=$(jq -r '.status' /tmp/health_response.json)
        ENV_STATUS=$(jq -r '.env_check.status' /tmp/health_response.json)
        SUPABASE_STATUS=$(jq -r '.services.supabase.status' /tmp/health_response.json)
        
        echo "  Overall Status: $OVERALL_STATUS"
        echo "  Environment Check: $ENV_STATUS"
        echo "  Supabase Service: $SUPABASE_STATUS"
        
        if [ "$OVERALL_STATUS" = "healthy" ] && [ "$ENV_STATUS" = "healthy" ]; then
            print_success "All health checks passed!"
        else
            print_warning "Some health checks failed"
            print_status "Full response:"
            jq . /tmp/health_response.json
        fi
    else
        print_status "Install jq for detailed health check analysis"
        print_status "Response saved to /tmp/health_response.json"
    fi
else
    print_error "Health check endpoint returned HTTP $HTTP_STATUS"
    if [ -f /tmp/health_response.json ]; then
        print_status "Error response:"
        cat /tmp/health_response.json
    fi
fi

# Test 2: Main site
print_status "Test 2: Main site accessibility..."
MAIN_HTTP_STATUS=$(curl -s -w "%{http_code}" "$PROD_URL" -o /tmp/main_response.html)

if [ "$MAIN_HTTP_STATUS" = "200" ]; then
    print_success "Main site returned HTTP 200"
    
    # Check if it contains expected content
    if grep -q "Maskom" /tmp/main_response.html; then
        print_success "Main site contains expected content"
    else
        print_warning "Main site may not be loading correctly"
    fi
else
    print_error "Main site returned HTTP $MAIN_HTTP_STATUS"
fi

# Test 3: API endpoints
print_status "Test 3: API endpoint accessibility..."

# Test a few API endpoints
API_ENDPOINTS=(
    "/api/health"
    "/api/status"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    print_status "Testing $endpoint..."
    API_STATUS=$(curl -s -w "%{http_code}" "${PROD_URL}${endpoint}" -o /dev/null)
    
    if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "503" ]; then
        print_success "$endpoint returned HTTP $API_STATUS"
    else
        print_warning "$endpoint returned HTTP $API_STATUS"
    fi
done

# Summary
echo ""
echo "====================================="
print_status "Verification Summary"

if [ "$HTTP_STATUS" = "200" ] && [ "$MAIN_HTTP_STATUS" = "200" ]; then
    print_success "✅ Production deployment is working correctly!"
    echo ""
    echo "Next steps:"
    echo "- Monitor the deployment in Cloudflare Pages dashboard"
    echo "- Set up monitoring alerts for future issues"
    echo "- Test user workflows manually"
else
    print_error "❌ Production deployment has issues"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check environment variables in Cloudflare Pages dashboard"
    echo "2. Review deployment logs in Cloudflare Pages"
    echo "3. Run the fix script: ./scripts/fix-production-env.sh"
    echo "4. Check GitHub Actions deployment logs"
fi

# Cleanup
rm -f /tmp/health_response.json /tmp/main_response.html

echo ""
print_status "Verification complete!"