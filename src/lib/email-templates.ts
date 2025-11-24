// import type { AstroComponent } from 'astro';

// Email template types
export interface EmailTemplate {
  type:
    | 'welcome'
    | 'installation'
    | 'billing'
    | 'password-reset'
    | 'status-update'
    | 'appointment';
  language: 'id' | 'en';
  data: Record<string, any>;
}

export interface EmailRenderResult {
  html: string;
  subject: string;
  previewText: string;
  language: string;
  type: string;
}

export interface TemplateData {
  // Welcome email
  userName?: string;
  userEmail?: string;
  activationLink?: string;
  packageName?: string;

  // Installation email
  serviceName?: string;
  installationDate?: string;
  installationTime?: string;
  technicianName?: string;
  technicianPhone?: string;
  address?: string;
  trackingLink?: string;

  // Billing email
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
  billingPeriod?: string;
  paymentMethods?: Array<{
    name: string;
    instructions: string;
  }>;
  paymentLink?: string;
  lateFee?: string;

  // Password reset email
  resetLink?: string;
  expiryTime?: string;
  requestTime?: string;
  ipAddress?: string;

  // Status update email
  statusType?: 'maintenance' | 'outage' | 'resolved' | 'upgrade';
  statusTitle?: string;
  statusMessage?: string;
  affectedAreas?: string[];
  startTime?: string;
  estimatedResolution?: string;
  resolutionTime?: string;
  updates?: Array<{
    time: string;
    message: string;
  }>;
  statusPageLink?: string;

  // Appointment email
  appointmentType?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  duration?: string;
  location?: string;
  staffName?: string;
  staffPhone?: string;
  purpose?: string;
  notes?: string;
  calendarLink?: string;
  rescheduleLink?: string;
  cancelLink?: string;
}

class EmailTemplateService {
  private templates: Map<string, any> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private async initializeTemplates() {
    // In a real environment, templates would be imported here
    // For now, we'll register template names for validation
    const templateTypes = [
      'welcome',
      'installation',
      'billing',
      'password-reset',
      'status-update',
      'appointment',
    ];

    templateTypes.forEach(type => {
      this.templates.set(type, null as any); // Placeholder for actual template
    });
  }

  /**
   * Render an email template with provided data
   */
  async renderTemplate(template: EmailTemplate): Promise<EmailRenderResult> {
    const templateExists = this.templates.has(template.type);

    if (!templateExists) {
      throw new Error(`Template not found: ${template.type}`);
    }

    try {
      // For now, return a mock HTML response
      // In production, this would render the actual Astro template
      const mockHtml = this.generateMockHtml(template);
      const subject = this.generateMockSubject(template);
      const previewText = this.generateMockPreviewText(template);

      return {
        html: mockHtml,
        subject,
        previewText,
        language: template.language,
        type: template.type,
      };
    } catch (error) {
      console.error(`Error rendering template ${template.type}:`, error);
      throw new Error(
        `Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateMockHtml(template: EmailTemplate): string {
    const { type, language, data } = template;

    return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.generateMockSubject(template)} - Maskom Network</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
    <h1 style="color: #111827;">${data.userName || 'User'}</h1>
    <p style="color: #374151;">This is a mock ${type} template in ${language}</p>
    <p>Template data: ${JSON.stringify(data, null, 2)}</p>
  </div>
</body>
</html>`;
  }

  private generateMockSubject(template: EmailTemplate): string {
    const subjects = {
      welcome:
        template.language === 'id'
          ? 'Selamat Datang di Maskom Network'
          : 'Welcome to Maskom Network',
      installation:
        template.language === 'id'
          ? 'Konfirmasi Instalasi'
          : 'Installation Confirmation',
      billing:
        template.language === 'id'
          ? 'Notifikasi Tagihan'
          : 'Billing Notification',
      'password-reset':
        template.language === 'id' ? 'Reset Password' : 'Password Reset',
      'status-update':
        template.language === 'id' ? 'Update Status' : 'Status Update',
      appointment:
        template.language === 'id'
          ? 'Konfirmasi Janji Temu'
          : 'Appointment Confirmation',
    };

    return subjects[template.type] || 'Maskom Network';
  }

  private generateMockPreviewText(template: EmailTemplate): string {
    return `Preview for ${template.type} template in ${template.language}`;
  }

  /**
   * Get available template types
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Validate template data
   */
  validateTemplateData(
    type: string,
    data: TemplateData
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (type) {
      case 'welcome':
        if (!data.userName) errors.push('userName is required');
        if (!data.userEmail) errors.push('userEmail is required');
        break;

      case 'installation':
        if (!data.userName) errors.push('userName is required');
        if (!data.serviceName) errors.push('serviceName is required');
        if (!data.installationDate) errors.push('installationDate is required');
        if (!data.installationTime) errors.push('installationTime is required');
        if (!data.technicianName) errors.push('technicianName is required');
        if (!data.technicianPhone) errors.push('technicianPhone is required');
        if (!data.address) errors.push('address is required');
        if (!data.packageName) errors.push('packageName is required');
        break;

      case 'billing':
        if (!data.userName) errors.push('userName is required');
        if (!data.invoiceNumber) errors.push('invoiceNumber is required');
        if (!data.packageName) errors.push('packageName is required');
        if (!data.amount) errors.push('amount is required');
        if (!data.dueDate) errors.push('dueDate is required');
        if (!data.billingPeriod) errors.push('billingPeriod is required');
        if (!data.paymentMethods || data.paymentMethods.length === 0) {
          errors.push('paymentMethods is required');
        }
        break;

      case 'password-reset':
        if (!data.userName) errors.push('userName is required');
        if (!data.resetLink) errors.push('resetLink is required');
        if (!data.expiryTime) errors.push('expiryTime is required');
        if (!data.requestTime) errors.push('requestTime is required');
        break;

      case 'status-update':
        if (!data.userName) errors.push('userName is required');
        if (!data.statusType) errors.push('statusType is required');
        if (!data.serviceName) errors.push('serviceName is required');
        if (!data.statusTitle) errors.push('statusTitle is required');
        if (!data.statusMessage) errors.push('statusMessage is required');
        break;

      case 'appointment':
        if (!data.userName) errors.push('userName is required');
        if (!data.appointmentType) errors.push('appointmentType is required');
        if (!data.appointmentDate) errors.push('appointmentDate is required');
        if (!data.appointmentTime) errors.push('appointmentTime is required');
        if (!data.duration) errors.push('duration is required');
        if (!data.location) errors.push('location is required');
        if (!data.staffName) errors.push('staffName is required');
        if (!data.staffPhone) errors.push('staffPhone is required');
        if (!data.purpose) errors.push('purpose is required');
        break;

      default:
        errors.push(`Unknown template type: ${type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get sample data for testing templates
   */
  getSampleData(type: string, language: 'id' | 'en' = 'id'): TemplateData {
    const samples = {
      welcome: {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        userEmail: 'user@example.com',
        activationLink: 'https://maskom.co.id/activate?token=abc123',
        packageName: language === 'id' ? 'Paket Home Pro' : 'Home Pro Package',
      },
      installation: {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        serviceName:
          language === 'id'
            ? 'Instalasi Internet Fiber'
            : 'Fiber Internet Installation',
        installationDate: '2025-11-20',
        installationTime: '09:00 - 12:00',
        technicianName: language === 'id' ? 'Ahmad Wijaya' : 'Ahmad Wijaya',
        technicianPhone: '+62 812-3456-7890',
        address:
          language === 'id'
            ? 'Jl. Merdeka No. 123, Jakarta'
            : '123 Merdeka Street, Jakarta',
        packageName: language === 'id' ? 'Paket Home Pro' : 'Home Pro Package',
        trackingLink: 'https://maskom.co.id/track/abc123',
      },
      billing: {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        invoiceNumber: 'INV-2025-001',
        packageName: language === 'id' ? 'Paket Home Pro' : 'Home Pro Package',
        amount: 'Rp 500.000',
        dueDate: '2025-11-30',
        billingPeriod: language === 'id' ? 'November 2025' : 'November 2025',
        paymentMethods: [
          {
            name: language === 'id' ? 'Transfer Bank' : 'Bank Transfer',
            instructions:
              language === 'id'
                ? 'Transfer ke BCA 123-456-789 a.n. PT Maskom Network'
                : 'Transfer to BCA 123-456-789 a.n. PT Maskom Network',
          },
          {
            name: language === 'id' ? 'E-Wallet' : 'E-Wallet',
            instructions:
              language === 'id'
                ? 'Scan QR code di aplikasi GoPay, OVO, atau DANA'
                : 'Scan QR code in GoPay, OVO, or DANA app',
          },
        ],
        paymentLink: 'https://maskom.co.id/pay/INV-2025-001',
      },
      'password-reset': {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        resetLink: 'https://maskom.co.id/reset-password?token=xyz789',
        expiryTime: language === 'id' ? '24 jam' : '24 hours',
        requestTime: '2025-11-15 14:30:00',
        ipAddress: '192.168.1.100',
      },
      'status-update': {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        statusType: 'maintenance',
        serviceName:
          language === 'id'
            ? 'Layanan Internet Fiber'
            : 'Fiber Internet Service',
        statusTitle:
          language === 'id'
            ? 'Pemeliharaan Terjadwal Sistem'
            : 'Scheduled System Maintenance',
        statusMessage:
          language === 'id'
            ? 'Kami akan melakukan pemeliharaan sistem untuk meningkatkan kualitas layanan.'
            : 'We will perform system maintenance to improve service quality.',
        affectedAreas: [
          language === 'id' ? 'Jakarta Pusat' : 'Central Jakarta',
        ],
        startTime: '2025-11-16 01:00:00',
        estimatedResolution: '2025-11-16 03:00:00',
        updates: [
          {
            time: '2025-11-15 18:00:00',
            message:
              language === 'id'
                ? 'Pemeliharaan telah dijadwalkan.'
                : 'Maintenance has been scheduled.',
          },
        ],
        statusPageLink: 'https://maskom.co.id/status',
      },
      appointment: {
        userName: language === 'id' ? 'Budi Santoso' : 'John Doe',
        appointmentType:
          language === 'id' ? 'Konsultasi Layanan' : 'Service Consultation',
        appointmentDate: '2025-11-18',
        appointmentTime: '14:00',
        duration: '1 jam',
        location:
          language === 'id'
            ? 'Kantor Maskom Network, Jl. Sudirman No. 456, Jakarta'
            : 'Maskom Network Office, 456 Sudirman Street, Jakarta',
        staffName: language === 'id' ? 'Siti Nurhaliza' : 'Siti Nurhaliza',
        staffPhone: '+62 812-3456-7890',
        purpose:
          language === 'id'
            ? 'Diskusi upgrade paket internet'
            : 'Internet package upgrade discussion',
        notes:
          language === 'id'
            ? 'Mohon bawa dokumen identitas dan tagihan terakhir'
            : 'Please bring identification documents and latest bill',
        calendarLink: 'https://calendar.google.com/event?action=TEMPLATE&...',
        rescheduleLink: 'https://maskom.co.id/reschedule/abc123',
        cancelLink: 'https://maskom.co.id/cancel/abc123',
      },
    };

    return (samples as any)[type] || {};
  }
}

// Singleton instance
export const emailTemplateService = new EmailTemplateService();
export default emailTemplateService;
