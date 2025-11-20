# API Documentation

## Overview

Astro Maskom provides RESTful APIs for authentication, chat functionality, and various backend services. All APIs are built with Astro and integrate with Supabase for data persistence.

**⚠️ Current Status**: APIs are functional but have critical infrastructure issues. See issues #302 (TypeScript), #305 (CSP), #303 (Logging).

## Base URL

```
https://your-domain.com/api
```

## Authentication

### Register User

**POST** `/auth/register`

Register a new user account.

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### Response

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Email already registered"
}
```

### Sign In

**POST** `/auth/signin`

Authenticate user and create session.

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token"
  }
}
```

### Sign Out

**POST** `/auth/signout`

End user session.

#### Headers

```
Authorization: Bearer jwt-token
```

#### Response

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

## Chat API

### Chat Completion

**POST** `/chat/completion`

Get AI-powered chat responses.

#### Headers

```
Authorization: Bearer jwt-token
Content-Type: application/json
```

#### Request Body

```json
{
  "message": "Hello, I need help with my internet service",
  "conversation_id": "optional-conversation-uuid"
}
```

#### Response

```json
{
  "success": true,
  "response": "Hello! I'd be happy to help you with your internet service. What specific issue are you experiencing?",
  "conversation_id": "uuid",
  "timestamp": "2025-11-14T16:30:00Z"
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

## Error Handling

### Standard Error Format

All API errors follow this format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- Authentication endpoints: 5 requests per minute
- Chat endpoints: 20 requests per minute
- General endpoints: 100 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Security

### Authentication

- JWT tokens for authentication
- Token expiration: 24 hours
- Refresh tokens available
- Secure token storage recommended

### Data Validation

- **✅ IMPLEMENTED**: Comprehensive validation system with schemas
- SQL injection protection via Supabase RLS
- **✅ IMPLEMENTED**: Input validation for all API endpoints (see `src/lib/validation/`)
- **⚠️ IN PROGRESS**: CSP hardening for XSS protection (Issue #305)

### HTTPS

- All API calls require HTTPS
- TLS 1.2+ enforced
- HSTS headers enabled

## SDK Examples

### JavaScript/TypeScript

```typescript
// Authentication
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
  }),
});

// Chat API
const chatResponse = await fetch('/api/chat/completion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    message: 'Hello, I need help',
  }),
});
```

### cURL Examples

```bash
# Register user
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Send chat message
curl -X POST https://your-domain.com/api/chat/completion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message":"Hello, I need help"}'
```

## Testing

### Local Development

```bash
# Start development server
npm run dev

# Test endpoints
curl http://localhost:4321/api/auth/register
```

### Environment Variables

Required for API functionality:

```
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key  # For chat functionality
```

## Current API Issues

### Critical Issues (November 2025)

- **TypeScript Configuration Crisis**: Build system broken (Issue #302)
- **CSP Hardening Needed**: Security headers incomplete (Issue #305)
- **Logging Inconsistencies**: Console statements need replacement (Issue #303)
- **Performance Monitoring**: No metrics or monitoring (Issue #304)

### Recently Resolved

- **✅ Security Vulnerabilities**: Dependencies updated (Issue #71)
- **✅ Input Validation**: Comprehensive validation implemented
- **✅ Error Handling**: Structured error responses added

### Planned Enhancements

- **Status API**: Network monitoring endpoints (Issue #60)
- **Coverage API**: Address validation and coverage checking (Issue #77)
- **Billing API**: Payment and subscription management (Issue #78)
- **Notification API**: Email and SMS notifications (Issue #87)

## Changelog

### v1.0.0-alpha (2025-11-15)

- Initial API release
- Authentication endpoints (register, signin, signout)
- Chat completion functionality with OpenAI integration
- Basic error handling
- **❌ KNOWN ISSUES**: Security vulnerabilities, missing validation

### Upcoming v1.0.1 (Critical Fixes)

- TypeScript configuration fixes (Issue #302)
- CSP hardening implementation (Issue #305)
- Structured logging replacement (Issue #303)
- Performance monitoring setup (Issue #304)
- Rate limiting enhancements

---

## 📊 API Endpoint Status

### Authentication APIs
- **POST /api/auth/register**: ✅ Working
- **POST /api/auth/signin**: ✅ Working
- **POST /api/auth/signout**: ✅ Working
- **POST /api/auth/mfa/setup**: ✅ Working
- **POST /api/auth/verify-mfa**: ✅ Working

### Chat APIs
- **POST /api/chat/completion**: ✅ Working (requires OpenAI API key)

### Billing APIs
- **POST /api/payments/create**: ✅ Working
- **POST /api/payments/webhook**: ✅ Working
- **GET /api/payments/history**: ✅ Working
- **GET /api/payments/status**: ✅ Working

### Account APIs
- **GET /api/account**: ✅ Working
- **PUT /api/account/profile**: ✅ Working
- **GET /api/account/addresses**: ✅ Working

### Support APIs
- **GET /api/kb/articles**: ✅ Working
- **POST /api/support/tickets**: ✅ Working
- **GET /api/support/tickets**: ✅ Working

### System APIs
- **GET /api/health**: ✅ Working
- **GET /api/status**: ✅ Working

---

_Last Updated: 2025-11-19_
_API Health: 🟡 MEDIUM - Infrastructure issues identified, core functionality working_
