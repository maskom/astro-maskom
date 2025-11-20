# API Documentation

## Overview

Astro Maskom provides RESTful APIs for authentication, chat functionality, and various backend services. All APIs are built with Astro and integrate with Supabase for data persistence.

**⚠️ Current Status**: APIs are functional but have critical security vulnerabilities and missing error handling. See issues #71, #72, #103.

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

- **⚠️ PARTIALLY IMPLEMENTED**: Basic validation exists
- SQL injection protection via Supabase RLS
- **❌ MISSING**: Comprehensive input validation (Issue #103)
- **❌ MISSING**: XSS protection implementation

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

### Critical Issues

- **Security Vulnerabilities**: Outdated dependencies (Issue #71)
- **Build Errors**: TypeScript compilation failing (Issue #72)
- **Missing Validation**: Input validation not implemented (Issue #103)

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

### Upcoming v1.0.1

- Security vulnerability patches
- Input validation implementation
- Error handling improvements
- Rate limiting enhancements

---

For API support and questions, please create an issue in the repository.

_Last Updated: 2025-11-15_
_API Health: 🔴 CRITICAL - Security vulnerabilities present_
