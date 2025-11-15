# Email Queue System Documentation

## Overview

The Email Queue System provides a robust, scalable infrastructure for handling email communications in the Maskom Network application. It ensures reliable email delivery with retry logic, rate limiting, and comprehensive monitoring.

## Architecture

### Components

1. **Database Schema** (`docs/supabase/migrations/20251115_email_queue_system.sql`)
   - `email_queue` - Main queue table for storing emails
   - `email_templates` - Reusable email templates
   - `email_delivery_logs` - Delivery tracking and logs
   - `email_queue_settings` - Configuration settings

2. **Email Queue Service** (`src/lib/email/queue.ts`)
   - Core queue management functionality
   - Template rendering and processing
   - Database operations

3. **Email Service** (`src/lib/email/service.ts`)
   - High-level email operations
   - Pre-built email types (welcome, payment, etc.)
   - Queue processing orchestration

4. **Queue Processor** (`src/lib/email/processor.ts`)
   - Background job processing
   - Automatic retry logic
   - Cleanup and maintenance

5. **API Endpoints** (`src/pages/api/email/`)
   - REST API for email operations
   - Queue management endpoints
   - Monitoring and statistics

## Features

### ✅ Core Functionality
- **Queue Management**: Add, process, and monitor emails
- **Template System**: Reusable email templates with dynamic content
- **Retry Logic**: Exponential backoff for failed deliveries
- **Rate Limiting**: Prevent API abuse and ensure compliance
- **Priority Queuing**: High-priority emails processed first
- **Delivery Tracking**: Comprehensive logging and monitoring

### ✅ Email Types
- **Transactional Emails**: Welcome, payment confirmation, password reset
- **Service Notifications**: System alerts, maintenance notices
- **Billing Communications**: Invoices, payment reminders
- **Custom Emails**: Flexible sending options

### ✅ Monitoring & Analytics
- **Queue Statistics**: Real-time queue health metrics
- **Delivery Logs**: Detailed tracking of all email attempts
- **Performance Metrics**: Delivery times and success rates
- **Error Tracking**: Failed delivery analysis

## Quick Start

### 1. Database Setup

Run the migration to create the email queue schema:

```sql
-- Apply the migration
-- docs/supabase/migrations/20251115_email_queue_system.sql
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Queue Configuration
EMAIL_QUEUE_INTERVAL_MS=60000
EMAIL_QUEUE_BATCH_SIZE=10
```

### 3. Start Queue Processor

```bash
# Start the background processor
npm run email:queue:start

# Process queue manually
npm run email:queue:process

# Send test email
npm run email:test
```

## Usage Examples

### Sending Emails

#### Basic Email
```typescript
import { emailService } from '@/lib/email';

await emailService.sendCustomEmail({
  to: 'customer@example.com',
  subject: 'Your order is confirmed',
  html: '<h1>Thank you for your order!</h1>',
  text: 'Thank you for your order!'
});
```

#### Template-based Email
```typescript
await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

await emailService.sendPaymentConfirmation('user@example.com', {
  orderId: 'ORD-123',
  amount: 100000,
  currency: 'IDR',
  productName: 'Internet Package'
});
```

#### Service Notification
```typescript
await emailService.sendServiceNotification(
  'admin@example.com',
  'System Maintenance',
  'Scheduled maintenance will occur tonight at 2 AM.',
  'warning'
);
```

### Queue Management

#### Get Queue Statistics
```typescript
const stats = await emailService.getQueueStats();
console.log(`Pending: ${stats.pending_count}, Sent today: ${stats.sent_today}`);
```

#### Process Queue Manually
```typescript
const result = await emailService.processQueue();
console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
```

### Template Management

#### Create Template
```typescript
const queueService = emailService.getQueueService();

const templateId = await queueService.createTemplate({
  name: 'newsletter',
  subject_template: 'Newsletter - {{month}} {{year}}',
  html_template: '<h1>{{title}}</h1><p>{{content}}</p>',
  category: 'marketing'
});
```

#### Use Template
```typescript
await emailService.sendCustomEmail({
  to: 'subscriber@example.com',
  template: 'newsletter',
  templateData: {
    month: 'November',
    year: '2024',
    title: 'Latest Updates',
    content: 'Check out our new features...'
  }
});
```

## API Endpoints

### Send Email
```
POST /api/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello World</h1>",
  "priority": 3
}
```

### Process Queue
```
POST /api/email/queue
```

### Get Queue Statistics
```
GET /api/email/queue
```

### Get Templates
```
GET /api/email/templates?category=transactional
```

### Create Template
```
POST /api/email/templates
Content-Type: application/json

{
  "name": "custom_template",
  "subject_template": "Hello {{name}}",
  "html_template": "<h1>Welcome {{name}}!</h1>",
  "category": "transactional"
}
```

### Get Delivery Logs
```
GET /api/email/logs?emailId=uuid
```

## Configuration

### Queue Settings
Settings are stored in the `email_queue_settings` table:

- `max_batch_size`: Maximum emails per batch (default: 50)
- `retry_delay_minutes`: Initial retry delay (default: 5)
- `max_retry_attempts`: Maximum retry attempts (default: 3)
- `rate_limit_per_minute`: Emails per minute limit (default: 10)
- `queue_processing_interval_seconds`: Processing interval (default: 60)

### Email Priorities
- **1-2**: Critical (system alerts, security)
- **3-4**: High (transactional emails)
- **5-6**: Normal (notifications)
- **7-8**: Low (marketing)
- **9-10**: Bulk (campaigns)

### Retry Logic
Exponential backoff schedule:
- Attempt 1: 5 minutes
- Attempt 2: 15 minutes
- Attempt 3: 45 minutes
- Attempt 4: 2 hours
- Attempt 5: 6 hours
- Attempt 6: 12 hours
- Attempt 7+: 24 hours

## Monitoring

### Health Checks
Monitor these metrics for system health:

```typescript
const stats = await emailService.getQueueStats();

// Healthy indicators
const isHealthy = 
  stats.pending_count < 1000 &&        // Not too many pending
  stats.failed_today < 10 &&          # Low failure rate
  stats.retry_count < 100;            # Manageable retries
```

### Performance Metrics
Track these KPIs:
- **Delivery Rate**: `sent_today / (sent_today + failed_today)`
- **Queue Processing Time**: Time from queued to sent
- **Retry Success Rate**: Emails recovered after retries
- **Template Usage**: Most used templates

### Alerts
Set up alerts for:
- Queue size > 1000 emails
- Failure rate > 5%
- Retry count > 100
- Processing delays > 5 minutes

## Security

### Access Control
- Email queue operations require service role authentication
- Row Level Security (RLS) policies restrict access
- API endpoints should be protected by authentication

### Data Protection
- Personal data in emails is logged in delivery logs
- Template data is sanitized before rendering
- Email content is stored securely in database

### Compliance
- Rate limiting prevents spam
- Unsubscribe handling for marketing emails
- Data retention policies for old emails

## Troubleshooting

### Common Issues

#### Emails Not Sending
1. Check queue statistics: `GET /api/email/queue`
2. Verify processor is running: Check logs
3. Check error messages in delivery logs
4. Validate email addresses and templates

#### High Failure Rate
1. Review error messages in logs
2. Check email provider configuration
3. Verify rate limits aren't exceeded
4. Check template syntax and data

#### Performance Issues
1. Monitor queue size and processing time
2. Adjust batch size and processing interval
3. Check database performance
4. Consider scaling queue processor

### Debug Commands

```bash
# Check queue status
curl http://localhost:4321/api/email/queue

# Process queue manually
curl -X POST http://localhost:4321/api/email/queue

# Get delivery logs for specific email
curl "http://localhost:4321/api/email/logs?emailId=uuid"
```

## Maintenance

### Daily Tasks
- Monitor queue statistics
- Review failed deliveries
- Check error rates
- Verify processor health

### Weekly Tasks
- Clean up old emails (30+ days)
- Review template performance
- Update queue settings if needed
- Check rate limit compliance

### Monthly Tasks
- Analyze delivery trends
- Update email templates
- Review security policies
- Performance optimization

## Integration Examples

### With User Registration
```typescript
// In user registration endpoint
await emailService.sendWelcomeEmail(newUser.email, newUser.name);
```

### With Payment Processing
```typescript
// After successful payment
await emailService.sendPaymentConfirmation(user.email, {
  orderId: payment.id,
  amount: payment.amount,
  currency: 'IDR',
  productName: product.name
});
```

### With System Monitoring
```typescript
// In error handling
await emailService.sendServiceNotification(
  'admin@maskom.network',
  'Database Connection Failed',
  'Unable to connect to primary database',
  'error'
);
```

## Best Practices

1. **Use Templates**: Avoid hardcoded email content
2. **Set Appropriate Priorities**: Critical emails first
3. **Monitor Queue Health**: Proactive issue detection
4. **Handle Errors Gracefully**: Proper retry logic
5. **Secure Personal Data**: Follow privacy regulations
6. **Test Thoroughly**: Verify templates and delivery
7. **Document Templates**: Clear naming and usage
8. **Rate Limit**: Prevent provider blocking
9. **Track Metrics**: Data-driven optimization
10. **Plan Scale**: Design for growth

## Support

For issues or questions about the Email Queue System:
1. Check this documentation
2. Review error logs and delivery logs
3. Test with the email test command
4. Contact the development team

---

*This documentation covers the Email Queue System implementation for Maskom Network. For additional information, see the code comments and API documentation.*