# Email Templates Documentation

## Overview

This document describes the comprehensive email template system for Maskom Network. The system provides responsive, multi-language email templates for all transactional communications with customers.

## Features

- ✅ **Responsive Design**: Optimized for all email clients and devices
- ✅ **Multi-language Support**: Indonesian (ID) and English (EN)
- ✅ **Brand Consistency**: Consistent with Maskom Network branding
- ✅ **Template Types**: 6 different email template types
- ✅ **Dynamic Content**: Personalized content with variable substitution
- ✅ **Preview System**: Built-in preview and testing capabilities
- ✅ **API Integration**: RESTful API for template rendering
- ✅ **Type Safety**: Full TypeScript support

## Available Templates

### 1. Welcome Email (`welcome`)
**Purpose**: Welcome new users after registration

**Required Data**:
- `userName` (string): Customer name
- `userEmail` (string): Customer email
- `activationLink` (string, optional): Account activation URL
- `packageName` (string, optional): Service package name

**Use Cases**:
- New user registration confirmation
- Account activation
- Welcome sequence

### 2. Installation Confirmation (`installation`)
**Purpose**: Confirm service installation appointments

**Required Data**:
- `userName` (string): Customer name
- `serviceName` (string): Service being installed
- `installationDate` (string): Installation date
- `installationTime` (string): Installation time window
- `technicianName` (string): Technician name
- `technicianPhone` (string): Technician contact
- `address` (string): Installation address
- `packageName` (string): Service package name
- `trackingLink` (string, optional): Installation tracking URL

**Use Cases**:
- Installation scheduling confirmation
- Technician assignment notification
- Installation reminder

### 3. Billing Notifications (`billing`)
**Purpose**: Send billing-related communications

**Required Data**:
- `userName` (string): Customer name
- `invoiceNumber` (string): Invoice identifier
- `packageName` (string): Service package name
- `amount` (string): Invoice amount
- `dueDate` (string): Payment due date
- `billingPeriod` (string): Billing period
- `paymentMethods` (array): Available payment methods
- `paymentLink` (string, optional): Payment URL
- `lateFee` (string, optional): Late fee amount
- `type` (string): Invoice type ('invoice', 'reminder', 'overdue', 'success')

**Use Cases**:
- Monthly invoices
- Payment reminders
- Overdue notices
- Payment confirmations

### 4. Password Reset (`password-reset`)
**Purpose**: Secure password reset requests

**Required Data**:
- `userName` (string): User name
- `resetLink` (string): Password reset URL
- `expiryTime` (string): Link expiration time
- `requestTime` (string): Request timestamp
- `ipAddress` (string, optional): Request IP address

**Use Cases**:
- Password reset requests
- Security notifications
- Account recovery

### 5. Status Updates (`status-update`)
**Purpose**: Service status communications

**Required Data**:
- `userName` (string): Customer name
- `statusType` (string): Status type ('maintenance', 'outage', 'resolved', 'upgrade')
- `serviceName` (string): Affected service name
- `statusTitle` (string): Status title
- `statusMessage` (string): Detailed status message
- `affectedAreas` (array, optional): Affected geographical areas
- `startTime` (string, optional): Start time
- `estimatedResolution` (string, optional): Estimated resolution time
- `resolutionTime` (string, optional): Actual resolution time
- `updates` (array, optional): Status update timeline
- `statusPageLink` (string, optional): Status page URL

**Use Cases**:
- Scheduled maintenance notifications
- Service outage alerts
- Resolution notifications
- Service upgrade announcements

### 6. Appointment Confirmation (`appointment`)
**Purpose**: Confirm and manage appointments

**Required Data**:
- `userName` (string): Customer name
- `appointmentType` (string): Type of appointment
- `appointmentDate` (string): Appointment date
- `appointmentTime` (string): Appointment time
- `duration` (string): Expected duration
- `location` (string): Appointment location
- `staffName` (string): Staff member name
- `staffPhone` (string): Staff contact
- `purpose` (string): Appointment purpose
- `notes` (string, optional): Additional notes
- `calendarLink` (string, optional): Calendar integration link
- `rescheduleLink` (string, optional): Rescheduling URL
- `cancelLink` (string, optional): Cancellation URL

**Use Cases**:
- Customer service appointments
- Technical support scheduling
- Consultation bookings
- Installation scheduling

## API Usage

### Preview Template

```bash
# Get HTML preview with sample data
GET /api/email/preview?type=welcome&language=id&preview=true

# Get template metadata
GET /api/email/preview?type=welcome&language=id
```

### Render Template with Custom Data

```bash
POST /api/email/preview
Content-Type: application/json

{
  "templateType": "welcome",
  "language": "id",
  "data": {
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "packageName": "Paket Home Pro"
  }
}
```

### List Available Templates

```bash
GET /api/email/templates
```

## Template Service Usage

```typescript
import { emailTemplateService } from '../src/lib/email-templates';

// Render a template
const result = await emailTemplateService.renderTemplate({
  type: 'welcome',
  language: 'id',
  data: {
    userName: 'Budi Santoso',
    userEmail: 'budi@example.com',
    packageName: 'Paket Home Pro'
  }
});

console.log(result.html);    // Rendered HTML
console.log(result.subject); // Email subject
console.log(result.previewText); // Preview text

// Validate template data
const validation = emailTemplateService.validateTemplateData('welcome', {
  userName: 'Test',
  userEmail: 'test@example.com'
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Get sample data for testing
const sampleData = emailTemplateService.getSampleData('welcome', 'id');
```

## Design Guidelines

### Brand Colors
- Primary: `#3B82F6` (Blue)
- Secondary: `#6B7280` (Gray)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)

### Typography
- Font Family: System fonts (San Francisco, Segoe UI, Roboto)
- Headings: 600 font weight
- Body text: 400 font weight
- Base size: 16px

### Layout
- Maximum width: 600px
- Padding: 20px mobile, 30px desktop
- Border radius: 6-8px
- Spacing: 8px, 16px, 24px, 32px

### Responsive Design
- Mobile-first approach
- Breakpoint: 600px
- Fluid layouts
- Touch-friendly buttons (minimum 44px height)

## Testing

### Unit Tests
Run the comprehensive test suite:

```bash
npm run test email-templates.test.ts
```

### Manual Testing
Use the built-in preview interface:

1. Navigate to `/admin/email-preview`
2. Select template type and language
3. Click "Load Preview" to see the rendered email
4. Use "Open in New Tab" for full-page preview
5. Use "Download HTML" to save for testing

### Email Client Testing
Test templates across popular email clients:
- Gmail (web and mobile)
- Outlook (web and desktop)
- Apple Mail
- Yahoo Mail
- Mobile email clients

## Best Practices

### Content Guidelines
- Keep subject lines under 50 characters
- Use clear, action-oriented language
- Personalize with customer name
- Include single, clear call-to-action
- Provide alternative text for images

### Technical Guidelines
- Use inline CSS for email client compatibility
- Include semantic HTML structure
- Add alt text for all images
- Test with and without images enabled
- Ensure accessibility with proper contrast ratios

### Performance Guidelines
- Optimize images for email (max 600px width)
- Keep total email size under 100KB
- Use web-safe fonts
- Minimize CSS and HTML
- Test loading times

## Security Considerations

### Data Validation
- All user input is validated before rendering
- HTML escaping prevents XSS attacks
- URL validation for links
- Email format validation

### Secure Links
- Use HTTPS for all links
- Include expiration tokens for sensitive actions
- Implement rate limiting for password resets
- Log security events

### Privacy Compliance
- Include unsubscribe links
- Honor privacy preferences
- Secure data handling
- GDPR compliance considerations

## Troubleshooting

### Common Issues

**Template not rendering:**
- Check if template type is correct
- Verify all required data is provided
- Check for syntax errors in template

**Styling issues:**
- Ensure inline CSS is used
- Check for email client-specific CSS issues
- Test with different email clients

**Missing translations:**
- Verify language parameter is correct
- Check translation keys in template
- Ensure fallback language is available

### Debug Mode
Enable debug logging:

```typescript
// In development
console.log('Template data:', data);
console.log('Render result:', result);
```

## Maintenance

### Adding New Templates
1. Create new Astro component in `src/components/emails/`
2. Follow naming convention: `TemplateNameEmail.astro`
3. Use EmailLayout as base
4. Add to template service initialization
5. Update documentation
6. Add tests

### Updating Translations
1. Update translation objects in templates
2. Test both languages
3. Update sample data
4. Verify consistency

### Performance Monitoring
- Monitor template rendering times
- Track email delivery rates
- Monitor preview page usage
- Check error rates

## Support

For questions or issues with the email template system:

- **Documentation**: This file
- **Code Examples**: `src/lib/email-templates.ts`
- **Tests**: `test/email-templates.test.ts`
- **Preview Interface**: `/admin/email-preview`
- **API Endpoints**: `/api/email/*`

## Version History

- **v1.0.0**: Initial implementation with 6 template types
- Multi-language support (ID/EN)
- Responsive design
- API integration
- Preview system
- Comprehensive testing