# Email Service Documentation

## Overview

The Maskom Network email service provides a comprehensive, provider-agnostic email sending system that integrates seamlessly with the existing Supabase infrastructure. The service supports multiple email providers and includes built-in testing, logging, and error handling.

## Features

- **Multiple Provider Support**: Supabase (default), SendGrid, AWS SES
- **TypeScript Support**: Full type safety and interfaces
- **Error Handling**: Comprehensive error handling and retry logic
- **Email Logging**: Built-in logging and delivery tracking
- **Testing Utilities**: Built-in email testing and connection validation
- **API Endpoints**: RESTful endpoints for email operations
- **Configuration Management**: Environment-based configuration

## Quick Start

### 1. Environment Configuration

Set up your email provider in `.env`:

```env
# Use Supabase (recommended for integration)
EMAIL_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Or use SendGrid
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@maskom.id
SENDGRID_FROM_NAME=Maskom Network
```

### 2. Basic Usage

```typescript
import { sendEmail } from '@/lib/email';

// Send a simple email
const result = await sendEmail({
  to: { email: 'customer@example.com', name: 'John Doe' },
  subject: 'Welcome to Maskom Network',
  html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
  text: 'Welcome! Thank you for joining us.',
});

if (result.success) {
  console.log('Email sent:', result.messageId);
} else {
  console.error('Email failed:', result.error);
}
```

### 3. Testing

```typescript
import { testEmail, testConnection } from '@/lib/email';

// Test email service
const testResult = await testEmail('test@example.com');
console.log('Test result:', testResult);

// Test connection
const connectionResult = await testConnection();
console.log('Connection:', connectionResult);
```

## Email Providers

### Supabase (Recommended)

**Pros:**
- No additional configuration needed
- Uses existing Supabase infrastructure
- Built-in rate limiting and security
- Cost-effective for small to medium volumes

**Cons:**
- Limited to transactional emails
- Fewer advanced features
- Lower sending limits

**Configuration:**
```env
EMAIL_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### SendGrid

**Pros:**
- High deliverability rates
- Advanced features (templates, analytics)
- Scalable for high volumes
- Detailed analytics and reporting

**Cons:**
- Additional service to manage
- Costs for higher volumes
- Requires API key management

**Configuration:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@maskom.id
SENDGRID_FROM_NAME=Maskom Network
```

### AWS SES

**Pros:**
- Very cost-effective at scale
- High deliverability
- AWS integration
- Pay-as-you-go pricing

**Cons:**
- Complex setup
- Requires AWS knowledge
- Sandbox mode for new accounts

**Configuration:**
```env
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_SES_FROM_EMAIL=noreply@maskom.id
AWS_SES_FROM_NAME=Maskom Network
```

## API Endpoints

### Send Email

```http
POST /api/email/send
Content-Type: application/json

{
  "to": "customer@example.com",
  "subject": "Test Email",
  "html": "<h1>Test</h1>",
  "text": "Test email content"
}
```

### Test Email

```http
GET /api/email/test?email=test@example.com
```

### Service Status

```http
GET /api/email/status
```

### Email Logs

```http
GET /api/email/logs?limit=50
DELETE /api/email/logs
```

## Advanced Usage

### Custom Email Service Instance

```typescript
import { EmailService } from '@/lib/email';

const emailService = EmailService.getInstance();

// Send with advanced options
const result = await emailService.sendEmail({
  to: [
    { email: 'user1@example.com', name: 'User One' },
    { email: 'user2@example.com', name: 'User Two' }
  ],
  cc: { email: 'manager@example.com' },
  subject: 'Team Update',
  html: '<p>Team update content...</p>',
  attachments: [
    {
      filename: 'report.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf'
    }
  ],
  headers: {
    'X-Priority': '1',
    'X-Mailer': 'Maskom Network'
  }
});
```

### Configuration Validation

```typescript
import { emailConfig } from '@/lib/email';

// Check configuration
const validation = emailConfig.validateConfig();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// Get current configuration
const config = emailConfig.getConfig();
console.log('Current provider:', config.provider);
```

### Email Logging

```typescript
import { emailService } from '@/lib/email';

// Get recent logs
const logs = emailService.getLogs(100);
console.log('Recent emails:', logs);

// Clear logs
emailService.clearLogs();
```

## Error Handling

The email service includes comprehensive error handling:

```typescript
import { sendEmail } from '@/lib/email';

try {
  const result = await sendEmail(options);
  
  if (!result.success) {
    // Handle delivery failure
    console.error('Email delivery failed:', result.error);
    
    // Check if it's a configuration error
    if (result.error.includes('configuration')) {
      // Handle configuration issues
    }
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

## Common Error Types

1. **Configuration Errors**: Missing or invalid environment variables
2. **Validation Errors**: Invalid email addresses or missing required fields
3. **Provider Errors**: API errors from email service providers
4. **Network Errors**: Connection issues or timeouts

## Best Practices

### 1. Environment Configuration

- Use different configurations for development and production
- Store sensitive keys in secure environment variables
- Test configuration before deployment

### 2. Error Handling

- Always check the `success` field in results
- Implement retry logic for transient failures
- Log errors for debugging and monitoring

### 3. Email Content

- Include both HTML and text versions
- Use responsive design for mobile clients
- Avoid spam trigger words and excessive links
- Include proper unsubscribe links for marketing emails

### 4. Rate Limiting

- Monitor provider rate limits
- Implement queueing for bulk emails
- Use exponential backoff for retries

### 5. Testing

- Test email delivery in development
- Use test email addresses
- Verify email rendering across clients

## Troubleshooting

### Common Issues

**Email not sending:**
1. Check environment configuration
2. Verify API keys and credentials
3. Test connection with `/api/email/status`
4. Check email logs for errors

**Configuration errors:**
1. Verify all required environment variables
2. Check for typos in variable names
3. Ensure API keys are valid and active

**Delivery issues:**
1. Check spam folders
2. Verify sender domain configuration
3. Monitor provider dashboards for issues
4. Check email content for spam triggers

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check email logs:

```typescript
const logs = emailService.getLogs();
console.log('Email logs:', logs);
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Environment Variables**: Use secure storage for production
3. **Input Validation**: Always validate email addresses and content
4. **Rate Limiting**: Implement proper rate limiting to prevent abuse
5. **Content Security**: Sanitize email content to prevent XSS

## Integration Examples

### User Registration

```typescript
async function sendWelcomeEmail(userEmail: string, userName: string) {
  const result = await sendEmail({
    to: { email: userEmail, name: userName },
    subject: 'Welcome to Maskom Network!',
    html: `
      <h1>Welcome, ${userName}!</h1>
      <p>Thank you for registering with Maskom Network.</p>
      <p>Your account is now active and ready to use.</p>
    `,
    text: `Welcome, ${userName}! Thank you for registering with Maskom Network.`,
  });
  
  return result;
}
```

### Password Reset

```typescript
async function sendPasswordResetEmail(userEmail: string, resetToken: string) {
  const resetUrl = `${process.env.SITE_URL}/reset-password?token=${resetToken}`;
  
  const result = await sendEmail({
    to: { email: userEmail },
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
  
  return result;
}
```

## Migration Guide

### From Direct Supabase Calls

```typescript
// Before
const { error } = await supabase.auth.admin.invokeAction('send_email', {
  to: email,
  subject: subject,
  html: html,
});

// After
import { sendEmail } from '@/lib/email';
const result = await sendEmail({ to: { email }, subject, html });
```

### From Other Email Services

The email service provides a consistent interface regardless of the underlying provider. Simply update your environment configuration and the service will handle the rest.

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review email logs for error details
3. Test with the `/api/email/test` endpoint
4. Verify configuration with `/api/email/status`

---

*Last Updated: 2025-11-15*