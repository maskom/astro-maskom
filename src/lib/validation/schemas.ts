import type { ValidationSchema } from './index';
import { CommonSchemas } from './index';

/**
 * Payment validation schemas
 */
export const PaymentSchemas = {
  // Create payment
  createPayment: {
    orderId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
      sanitize: true,
    },
    amount: CommonSchemas.positiveAmount,
    customerDetails: {
      type: 'object',
      required: true,
    },
    itemDetails: {
      type: 'object',
      required: true,
    },
    paymentMethod: {
      type: 'string',
      required: false,
      enum: ['credit_card', 'bank_transfer', 'ewallet', 'virtual_account'],
      maxLength: 50,
    },
  } as ValidationSchema,

  // Payment refund
  refundPayment: {
    transactionId: CommonSchemas.uuid,
    amount: CommonSchemas.positiveAmount,
    reason: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true,
    },
  } as ValidationSchema,

  // Payment cancel
  cancelPayment: {
    transactionId: CommonSchemas.uuid,
    reason: {
      type: 'string',
      required: false,
      maxLength: 500,
      sanitize: true,
    },
  } as ValidationSchema,

  // Payment status check
  paymentStatus: {
    transactionId: {
      ...CommonSchemas.uuid,
      required: false, // Make optional for query params to allow custom field mapping
    },
    order_id: {
      // Legacy support for query params
      type: 'string',
      required: false,
      custom: (value: string, data?: any) => {
        // If transactionId is not provided, validate order_id as UUID
        if (!data?.transactionId) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            return 'order_id must be a valid UUID';
          }
          if (data) data.transactionId = value; // Map to transactionId
        }
        return true;
      },
    },
  } as ValidationSchema,

  // Payment history
  paymentHistory: {
    ...CommonSchemas.pagination,
    startDate: CommonSchemas.dateRange.startDate,
    endDate: CommonSchemas.dateRange.endDate,
    status: {
      type: 'string',
      required: false,
      enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
    },
  } as ValidationSchema,

  // Payment methods
  paymentMethods: {
    type: {
      type: 'string',
      required: false,
      enum: ['credit_card', 'bank_transfer', 'ewallet', 'virtual_account'],
    },
  } as ValidationSchema,
};

/**
 * Authentication validation schemas
 */
export const AuthSchemas = {
  // Sign in
  signIn: {
    email: CommonSchemas.email,
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
    },
  } as ValidationSchema,

  // Register
  register: {
    email: CommonSchemas.email,
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      custom: (value: string) => {
        // At least one uppercase, one lowercase, one number, one special character
        const strongPasswordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        return (
          strongPasswordRegex.test(value) ||
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        );
      },
    },
    fullName: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    phone: {
      type: 'string',
      required: false,
      pattern: /^\+?[\d\s\-()]+$/,
      maxLength: 20,
    },
  } as ValidationSchema,

  // MFA verification
  verifyMFA: {
    code: {
      type: 'string',
      required: true,
      minLength: 6,
      maxLength: 6,
      pattern: /^\d{6}$/,
    },
  } as ValidationSchema,

  // MFA setup
  setupMFA: {
    secret: {
      type: 'string',
      required: true,
      minLength: 32,
      maxLength: 32,
    },
    code: {
      type: 'string',
      required: true,
      minLength: 6,
      maxLength: 6,
      pattern: /^\d{6}$/,
    },
  } as ValidationSchema,
};

/**
 * Account validation schemas
 */
export const AccountSchemas = {
  // Update profile
  updateProfile: {
    fullName: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    phone: {
      type: 'string',
      required: false,
      pattern: /^\+?[\d\s\-()]+$/,
      maxLength: 20,
    },
    email: CommonSchemas.optionalEmail,
  } as ValidationSchema,

  // Update address
  updateAddress: {
    type: {
      type: 'string',
      required: true,
      enum: ['billing', 'shipping'],
    },
    street: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 200,
      sanitize: true,
    },
    city: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    province: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
    postalCode: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 10,
      pattern: /^\d+$/,
    },
    country: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true,
    },
  } as ValidationSchema,

  // Change password
  changePassword: {
    currentPassword: {
      type: 'string',
      required: true,
      minLength: 1,
    },
    newPassword: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      custom: (value: string) => {
        const strongPasswordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        return (
          strongPasswordRegex.test(value) ||
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        );
      },
    },
    confirmPassword: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      custom: (value: string, data?: any) => {
        return value === data?.newPassword || 'Passwords do not match';
      },
    },
  } as ValidationSchema,
};

/**
 * Support validation schemas
 */
export const SupportSchemas = {
  // Create ticket
  createTicket: {
    subject: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 200,
      sanitize: true,
    },
    description: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 2000,
      sanitize: true,
    },
    category: {
      type: 'string',
      required: true,
      enum: ['technical', 'billing', 'account', 'service', 'other'],
    },
    priority: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    attachments: {
      type: 'array',
      required: false,
      custom: (value: any[]) => {
        if (value.length > 5) return 'Maximum 5 attachments allowed';
        return true;
      },
    },
  } as ValidationSchema,

  // Update ticket
  updateTicket: {
    status: {
      type: 'string',
      required: false,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
    },
    priority: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high', 'urgent'],
    },
    assignedTo: {
      type: 'string',
      required: false,
      maxLength: 100,
      sanitize: true,
    },
  } as ValidationSchema,

  // Ticket response
  ticketResponse: {
    message: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 2000,
      sanitize: true,
    },
    isInternal: {
      type: 'boolean',
      required: false,
    },
  } as ValidationSchema,

  // List tickets
  listTickets: {
    ...CommonSchemas.pagination,
    status: {
      type: 'string',
      required: false,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
    },
    category: {
      type: 'string',
      required: false,
      enum: ['technical', 'billing', 'account', 'service', 'other'],
    },
    priority: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high', 'urgent'],
    },
  } as ValidationSchema,
};

/**
 * Notification validation schemas
 */
export const NotificationSchemas = {
  // Update preferences
  updatePreferences: {
    emailNotifications: {
      type: 'boolean',
      required: false,
    },
    smsNotifications: {
      type: 'boolean',
      required: false,
    },
    inAppNotifications: {
      type: 'boolean',
      required: false,
    },
    pushNotifications: {
      type: 'boolean',
      required: false,
    },
    outageNotifications: {
      type: 'boolean',
      required: false,
    },
    maintenanceNotifications: {
      type: 'boolean',
      required: false,
    },
    billingNotifications: {
      type: 'boolean',
      required: false,
    },
    marketingNotifications: {
      type: 'boolean',
      required: false,
    },
    minimumSeverity: {
      type: 'string',
      required: false,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    quietHoursStart: {
      type: 'string',
      required: false,
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    quietHoursEnd: {
      type: 'string',
      required: false,
      pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
  } as ValidationSchema,

  // Send notification (admin)
  sendNotification: {
    userId: CommonSchemas.uuid,
    type: {
      type: 'string',
      required: true,
      enum: ['outage', 'maintenance', 'billing', 'marketing', 'security'],
    },
    title: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 200,
      sanitize: true,
    },
    message: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 1000,
      sanitize: true,
    },
    channels: {
      type: 'array',
      required: true,
      custom: (value: any[]) => {
        const validChannels = ['email', 'sms', 'in_app', 'push'];
        const invalidChannels = value.filter(
          channel => !validChannels.includes(channel)
        );
        if (invalidChannels.length > 0) {
          return `Invalid channels: ${invalidChannels.join(', ')}`;
        }
        return true;
      },
    },
  } as ValidationSchema,
};

/**
 * Knowledge Base validation schemas
 */
export const KnowledgeBaseSchemas = {
  // Search articles
  searchArticles: {
    query: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 200,
      sanitize: true,
    },
    category: {
      type: 'string',
      required: false,
      maxLength: 100,
      sanitize: true,
    },
    ...CommonSchemas.pagination,
  } as ValidationSchema,

  // Rate article
  rateArticle: {
    rating: {
      type: 'number',
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: 'string',
      required: false,
      maxLength: 500,
      sanitize: true,
    },
  } as ValidationSchema,

  // Create article (admin)
  createArticle: {
    title: {
      type: 'string',
      required: true,
      minLength: 10,
      maxLength: 200,
      sanitize: true,
    },
    content: {
      type: 'string',
      required: true,
      minLength: 50,
      maxLength: 10000,
      sanitize: true,
    },
    category: {
      type: 'string',
      required: true,
      maxLength: 100,
      sanitize: true,
    },
    tags: {
      type: 'array',
      required: false,
      custom: (value: any[]) => {
        if (value.length > 10) return 'Maximum 10 tags allowed';
        return (
          value.every(tag => typeof tag === 'string' && tag.length <= 50) ||
          'All tags must be strings with max 50 characters'
        );
      },
    },
    isPublished: {
      type: 'boolean',
      required: false,
    },
  } as ValidationSchema,

  // List categories
  listCategories: {
    ...CommonSchemas.pagination,
  } as ValidationSchema,
};

/**
 * Bandwidth validation schemas
 */
export const BandwidthSchemas = {
  // Get usage data
  getUsage: {
    startDate: CommonSchemas.dateRange.startDate,
    endDate: CommonSchemas.dateRange.endDate,
    granularity: {
      type: 'string',
      required: false,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
    },
  } as ValidationSchema,

  // Set data cap
  setDataCap: {
    userId: CommonSchemas.uuid,
    capLimit: {
      type: 'number',
      required: true,
      min: 1,
      max: 10000, // GB
    },
    billingCycle: {
      type: 'string',
      required: true,
      enum: ['monthly', 'weekly'],
    },
  } as ValidationSchema,

  // Usage notifications
  usageNotifications: {
    thresholds: {
      type: 'array',
      required: true,
      custom: (value: number[]) => {
        if (value.length === 0) return 'At least one threshold is required';
        if (value.length > 5) return 'Maximum 5 thresholds allowed';
        return (
          value.every(threshold => threshold >= 0 && threshold <= 100) ||
          'All thresholds must be between 0 and 100'
        );
      },
    },
    enabled: {
      type: 'boolean',
      required: false,
    },
  } as ValidationSchema,
};

/**
 * Security validation schemas
 */
export const SecuritySchemas = {
  // Export user data
  exportData: {
    userId: CommonSchemas.uuid,
    format: {
      type: 'string',
      required: false,
      enum: ['json', 'csv'],
    },
    includeSensitive: {
      type: 'boolean',
      required: false,
    },
  } as ValidationSchema,

  // Security dashboard
  securityDashboard: {
    startDate: CommonSchemas.dateRange.startDate,
    endDate: CommonSchemas.dateRange.endDate,
    eventType: {
      type: 'string',
      required: false,
      enum: [
        'login',
        'logout',
        'failed_login',
        'password_change',
        'mfa_enabled',
        'mfa_disabled',
      ],
    },
  } as ValidationSchema,

  // User list (admin)
  userList: {
    ...CommonSchemas.pagination,
    status: {
      type: 'string',
      required: false,
      enum: ['active', 'inactive', 'suspended', 'pending'],
    },
    role: {
      type: 'string',
      required: false,
      enum: ['user', 'admin', 'moderator'],
    },
  } as ValidationSchema,
};

/**
 * Utility validation schemas
 */
export const UtilitySchemas = {
  // Health check
  healthCheck: {} as ValidationSchema,

  // Status check
  statusCheck: {
    detailed: {
      type: 'boolean',
      required: false,
    },
  } as ValidationSchema,

  // Subscribe to updates
  subscribe: {
    email: CommonSchemas.email,
    topics: {
      type: 'array',
      required: true,
      custom: (value: any[]) => {
        const validTopics = ['outages', 'maintenance', 'updates', 'security'];
        const invalidTopics = value.filter(
          topic => !validTopics.includes(topic)
        );
        if (invalidTopics.length > 0) {
          return `Invalid topics: ${invalidTopics.join(', ')}`;
        }
        return true;
      },
    },
  } as ValidationSchema,
};
