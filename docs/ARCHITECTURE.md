# Architecture Documentation

## Overview

Astro Maskom is built with a modern, performance-focused architecture using Astro as the primary framework, Supabase for backend services, and Tailwind CSS for styling. This document outlines the system architecture, component relationships, and data flow.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   Data Layer    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│                 │    │                 │    │                 │
│ • Astro Pages   │◄──►│ • Astro Server  │◄──►│ • Supabase DB   │
│ • Components    │    │ • API Routes    │    │ • Auth Service  │
│ • Tailwind CSS  │    │ • Middleware    │    │ • Storage       │
│ • TypeScript    │    │ • SSR/SSG       │    │                 │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend

- **Astro 5.15.4**: Modern static site generator with SSR capabilities
- **TypeScript 5.9.3**: Type-safe JavaScript development
- **Tailwind CSS 3.4.18**: Utility-first CSS framework
- **Svelte**: Lightweight components for interactive features (being phased out)

#### Backend

- **Supabase**: Backend-as-a-Service providing:
  - PostgreSQL database
  - Authentication service
  - Real-time subscriptions
  - File storage
  - Edge functions

#### Deployment

- **Node.js**: Runtime environment (standalone mode)
- **Cloudflare Pages**: Static site hosting (planned)
- **GitHub Actions**: Advanced automation workflows (8 workflows)
- **OpenCode Integration**: Automated repository maintenance

## 📁 Project Structure Deep Dive

```
astro-maskom/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Astro/         # Astro-specific framework components
│   │   │   ├── Frameworks.astro    # Technology showcase
│   │   │   └── Hero.astro          # Landing page hero
│   │   ├── chat/          # Chatbot functionality
│   │   │   └── Chatbot.astro       # AI-powered chat interface
│   │   ├── ui/            # General UI components
│   │   │   ├── Background.astro    # Background components
│   │   │   ├── Footer.astro        # Site footer
│   │   │   ├── Header.astro        # Navigation header
│   │   │   ├── Hero.astro          # Generic hero component
│   │   │   ├── Package*.astro      # Package display components
│   │   │   └── Packages.astro      # Package listing
│   │   └── Card.astro      # Reusable card component
│   ├── data/              # Static data and configuration
│   │   ├── navigation.ts  # Site navigation structure
│   │   ├── packages.ts    # Service package definitions
│   │   └── site.ts        # Site metadata and configuration
│   ├── layouts/           # Page layout templates
│   │   └── Layout.astro   # Main site layout
│   ├── lib/               # Utility libraries and helpers
│   │   └── supabase.ts    # Supabase client configuration
│   ├── pages/             # Astro pages and API routes
│   │   ├── api/           # API endpoints
│   │   │   ├── auth/      # Authentication endpoints
│   │   │   │   ├── register.ts     # User registration
│   │   │   │   ├── signin.ts       # User login
│   │   │   │   └── signout.ts      # User logout
│   │   │   └── chat/      # Chat functionality
│   │   │       └── completion.ts   # AI chat completion
│   │   ├── *.astro        # Static pages
│   │   ├── area-layanan.astro     # Service area page
│   │   ├── dashboard.astro        # Customer dashboard
│   │   ├── dukungan.astro         # Support page
│   │   ├── index.astro            # Homepage
│   │   ├── kontak.astro           # Contact page
│   │   ├── layanan.astro          # Services page
│   │   ├── register.astro         # Registration page
│   │   ├── signin.astro           # Login page
│   │   └── tentang-kami.astro     # About us page
│   └── styles/            # Global styles
│       └── global.css     # Base CSS styles
├── docs/                  # Documentation
├── public/                # Static assets
└── supabase/             # Database configuration
```

## 🔄 Data Flow Architecture

### Authentication Flow

```
User → Sign In Form → API Route (/api/auth/signin) → Supabase Auth → JWT Token → Client Storage
```

### Chat Flow

```
User Message → Chatbot Component → API Route (/api/chat/completion) → OpenAI API → Response → UI Update
```

### Data Fetching Flow

```
Page Load → Astro Server Component → Supabase Client → Database → SSR → HTML → Client Hydration
```

## 🧩 Component Architecture

### Component Hierarchy

```
Layout.astro
├── Header.astro
│   ├── Navigation
│   └── User Menu
├── Main Content
│   ├── Hero.astro
│   ├── Packages.astro
│   │   ├── PackageHomeAccess.astro
│   │   ├── PackageSoho.astro
│   │   └── PackageCorporate.astro
│   └── Chatbot.astro
└── Footer.astro
```

### Component Patterns

#### 1. Astro Components (`.astro`)

- Used for static content and server-side logic
- Can contain TypeScript in code fences (`---`)
- Support component composition
- Optimized for minimal client-side JavaScript

#### 2. UI Components

- Reusable across multiple pages
- Accept props for customization
- Follow consistent design system
- Responsive by default

#### 3. API Routes

- Handle server-side logic
- Process authentication
- Interact with databases
- Return JSON responses

## 🔐 Security Architecture

### Authentication & Authorization

- **Supabase Auth**: Handles user authentication
- **JWT Tokens**: Stateless session management
- **Row Level Security (RLS)**: Database-level access control
- **Middleware**: Request validation and authentication

### Data Protection

- **Environment Variables**: Sensitive data protection
- **HTTPS**: Encrypted data transmission
- **Input Validation**: XSS and injection prevention
- **CORS**: Cross-origin request control

### Security Layers

```
┌─────────────────┐
│   Application   │ ← Input validation, error handling (NEEDS IMPLEMENTATION)
├─────────────────┤
│   API Routes    │ ← Authentication, rate limiting (PARTIALLY IMPLEMENTED)
├─────────────────┤
│   Supabase      │ ← RLS, encryption, audit logs (IMPLEMENTED)
├─────────────────┤
│   Infrastructure│ ← HTTPS, firewalls, monitoring (PARTIALLY IMPLEMENTED)
└─────────────────┘
```

### Current Security Issues

- **Critical**: Outdated dependencies (form-data, axios, js-yaml, undici)
- **High**: Missing input validation and error handling
- **Medium**: Hardcoded values in source code
- **Low**: No security scanning automation

## 📊 Performance Architecture

### Optimization Strategies

#### 1. Static Generation

- Pre-built pages at build time
- Minimal server-side processing
- CDN-friendly static assets

#### 2. Code Splitting

- Component-level code splitting
- Lazy loading for heavy components
- Optimized bundle sizes

#### 3. Caching Strategy

- Browser caching for static assets
- CDN caching for global distribution
- Database query caching

#### 4. Image Optimization

- Responsive images with Astro
- Modern image formats (WebP)
- Lazy loading implementation

### Performance Metrics (TARGETS)

- **First Contentful Paint**: < 1.5s (CURRENT: Unknown)
- **Largest Contentful Paint**: < 2.5s (CURRENT: Unknown)
- **Cumulative Layout Shift**: < 0.1 (CURRENT: Unknown)
- **First Input Delay**: < 100ms (CURRENT: Unknown)

### Current Performance Issues

- **High**: No performance monitoring implemented
- **Medium**: No code splitting or lazy loading
- **Medium**: No image optimization
- **Low**: Bundle size not optimized

## 🔌 Integration Architecture

### Third-Party Services

#### Supabase Integration

```typescript
// Client configuration
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);
```

#### OpenAI Integration

```typescript
// Chat completion API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  headers: {
    Authorization: `Bearer ${import.meta.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }],
  }),
});
```

### API Architecture

- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: Consistent request/response format
- **Error Handling**: Standardized error responses
- **Rate Limiting**: API abuse prevention

## 🚀 Deployment Architecture

### Build Process

```
Source Code → Astro Build → Static Files → Optimization → Deployment
```

### Environments

- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Hosting Strategy

- **Static Assets**: CDN distribution
- **Server Components**: Edge computing
- **Database**: Managed PostgreSQL
- **File Storage**: Object storage service

## 📈 Monitoring & Observability

### Logging Strategy

- **Application Logs**: Error tracking and debugging
- **Access Logs**: Request monitoring
- **Performance Logs**: Optimization insights

### Error Handling

- **Global Error Boundaries**: Prevent crashes
- **Graceful Degradation**: Fallback functionality
- **User Feedback**: Clear error messages

### Analytics

- **Performance Monitoring**: Core Web Vitals
- **User Analytics**: Behavior tracking
- **Business Metrics**: Conversion and engagement

## 🔮 Future Architecture Considerations

### Scalability

- **Microservices**: Service decomposition
- **Event-Driven Architecture**: Async processing
- **Load Balancing**: Traffic distribution
- **Database Sharding**: Horizontal scaling

### Enhanced Features

- **Progressive Web App**: Offline functionality
- **Real-time Updates**: WebSocket integration
- **AI Integration**: Advanced chatbot features
- **Multi-tenancy**: Business customer support

---

This architecture documentation serves as a guide for understanding the system design and making informed decisions about future development.

## 🚨 Current Architecture Issues

### Critical Issues

1. **Security Vulnerabilities**: Outdated dependencies with CVEs
2. **Build Failures**: TypeScript errors in Chatbot.astro
3. **Missing Dependencies**: Project cannot build/run properly

### High Priority Issues

1. **Code Quality**: No linting or formatting tools
2. **Testing**: No test infrastructure
3. **CI/CD**: Basic pipeline missing
4. **Documentation**: Missing security policy, code of conduct

### Medium Priority Issues

1. **Performance**: No optimization strategies implemented
2. **Error Handling**: No global error boundaries
3. **Environment**: Hardcoded values throughout codebase
4. **Monitoring**: No observability or logging

### Technical Debt Summary

- **Total Issues**: 23 (3 Critical, 5 High, 8 Medium, 7 Low)
- **Estimated Effort**: 60-80 hours
- **Time to Stable**: 2-3 weeks
- **Risk Level**: HIGH (Security vulnerabilities)

---

_Last Updated: 2025-11-15_
_Architecture Health: 🔴 CRITICAL_
