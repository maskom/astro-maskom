# Supabase Configuration Documentation

## Overview

This directory contains Supabase configuration files and documentation for the Astro Maskom database backend.

## Files

### config.toml

Supabase configuration file containing:

- Database connection settings
- Authentication configuration
- API endpoint definitions
- Environment-specific settings

## Database Schema

### Core Tables

- **users**: User authentication and profile data
- **packages**: Service package information and pricing
- **coverage_areas**: Geographic coverage zones
- **support_tickets**: Customer support ticket system
- **invoices**: Billing and payment information

### Authentication

- Supabase Auth handles user authentication
- JWT tokens for API access
- Role-based access control (RBAC)
- Social login integration support

## API Endpoints

### Authentication

- `POST /auth/v1/signup` - User registration
- `POST /auth/v1/token?grant_type=password` - User login
- `POST /auth/v1/logout` - User logout

### Database

- RESTful API auto-generated from database schema
- Row Level Security (RLS) policies implemented
- Real-time subscriptions available

## Environment Variables

Required environment variables for Supabase:

```
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Security

- Row Level Security enabled on all tables
- API keys properly scoped
- Environment variables for sensitive data
- Regular security audits recommended

## Performance Optimization

### Database Indexes

The database includes comprehensive indexing strategies for optimal performance:

#### Security Tables

- `security_audit_logs`: User-timestamp, action-timestamp, risk-level indexes
- `security_events`: Type-severity, user-timestamp, resolved-status indexes
- `security_alerts`: Event-id, severity-timestamp, acknowledgment indexes

#### Business Logic Tables

- `bandwidth_usage`: User-date composite with total bytes ordering
- `payment_transactions`: User-status-created composite indexes
- `invoices`: User-status-due date optimization
- `outage_events`: Status-created time for active outage queries

#### Specialized Indexes

- **Partial indexes** for common filtered queries (pending payments, overdue invoices)
- **JSONB GIN indexes** for metadata searches
- **Text search indexes** for outage content search
- **Function-based indexes** for calculated fields (usage in GB, percentages)
- **Covering indexes** to eliminate table lookups

#### Index Benefits

- Faster user security history queries
- Optimized bandwidth usage reporting
- Efficient payment status filtering
- Quick outage event lookups
- Improved search performance

### Migration Management

All performance optimizations are managed through Supabase migrations:

- Migrations are idempotent and safe to re-run
- Indexes use `IF NOT EXISTS` to prevent conflicts
- Comprehensive comments document index purposes
- Regular performance monitoring recommended

## Development Setup

1. Create Supabase project
2. Run database migrations
3. Set up environment variables
4. Configure authentication providers
5. Test API connectivity

---

_Last Updated: 2025-11-18_
