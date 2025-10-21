# Brand Visibility Tracker

## Overview

Brand Visibility Tracker is a Next.js-based SaaS application that helps businesses monitor and analyze their brand presence across AI platforms (ChatGPT, Claude, and Gemini). The application tracks brand mentions through different marketing funnel stages (TOFU, MOFU, BOFU, EVFU) and provides detailed analytics including sentiment analysis, performance metrics, and competitive intelligence.

The platform operates on a credit-based system where users purchase credits to run brand visibility analyses. It supports team collaboration with role-based access control, integrates with Stripe for payments, and uses QStash for asynchronous analysis processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 with App Router architecture using TypeScript and React 19

**UI Components**: Built on shadcn/ui component library (New York style variant) with Radix UI primitives, providing accessible and composable components for forms, dialogs, dropdowns, and data visualization

**Styling**: TailwindCSS v4 with custom theme variables for consistent design system, dark mode support via next-themes, and custom color scheme optimized for data visualization (teal + indigo palette)

**State Management**: 
- React Context API for global state (UserContext for authentication, MatrixContext for brand analytics data)
- Local component state with React hooks
- Form state managed via react-hook-form with Zod validation schemas

**Client-Side Routing**: File-based routing with dynamic segments for multi-tenant structure (`[userId]/brands/[brandId]`)

### Backend Architecture

**API Structure**: Next.js API routes following REST conventions with route grouping for logical organization:
- `/api/(auth)/*` - Authentication endpoints
- `/api/(brand)/*` - Brand CRUD operations
- `/api/(analysis)/*` - Analysis execution and status tracking
- `/api/credits/*` - Credit balance and transactions
- `/api/dashboard/*` - Dashboard metrics and analytics

**Authentication & Authorization**: 
- JWT-based authentication using jsonwebtoken and jose libraries
- Token stored in httpOnly cookies for security
- Custom middleware (`authMiddleware`) validates tokens on protected routes
- Role-based access control (owner, admin, viewer) enforced at API and route levels

**Middleware Strategy**: 
- Global middleware checks authentication state and redirects unauthenticated users
- Protected route validation for POST/PUT/DELETE operations
- Route protection utility (`isRouteProtected`) identifies secured endpoints

**Onboarding Flow**: Multi-step process (VERIFY_EMAIL → CREATE_BRAND → INVITE_MEMBER) tracked via `current_onboarding_step` field, ensuring users complete setup before accessing features

### Data Storage

**Primary Database**: MongoDB via Mongoose ODM with connection pooling and automatic reconnection handling

**Schema Design**:
- Users collection: Authentication, profile, plan association, credit balance
- Brands collection: Brand information, soft delete support (deletedAt field)
- Memberships collection: User-brand relationships with roles and status
- Invites collection: Pending team invitations with token expiration
- CreditTransactions collection: Audit trail for credit purchases, usage, refunds, bonuses
- Analysis results stored with stage-model matrix structure

**Data Models**: TypeScript interfaces mirror database schemas, with separate client-side types for API responses (e.g., `IBrand` for database, `DashboardBrand` for UI consumption)

### External Dependencies

**Email Service**: SendGrid API for transactional emails (verification, password reset, invitations, analysis completion notifications) with custom HTML templates

**Payment Processing**: Stripe integration for:
- Credit package purchases
- Checkout session creation
- Customer management (stripe_customer_id stored on users)
- Webhook handling for payment events

**Background Job Processing**: Upstash QStash for:
- Asynchronous analysis execution across AI models
- Long-running tasks that exceed serverless function timeouts
- Progress tracking via analysis status endpoints

**AI Platform Integration**: The application analyzes brand visibility across three AI models (ChatGPT, Claude, Gemini), though specific API integrations are abstracted from the visible codebase

**Environment Configuration**: Environment variables managed via dotenv for database URLs, API keys (SendGrid, Stripe, QStash), and application secrets

### Credit System Architecture

**Credit Model**: Pay-per-analysis system where:
- Each analysis consumes credits based on models and stages selected
- Credits estimated before execution via `/api/credits/estimate` endpoint
- Users can purchase credit packages with bonus credits for larger packages
- Free starter credits (50) provided to new users via bonus transactions

**Transaction Tracking**: All credit movements logged in CreditTransactions with types: purchase, usage, refund, bonus

**Balance Management**: User credit balance cached on User document with computed fields (credits_balance, total_credits_purchased, total_credits_used) for performance

### Analysis Architecture

**Analysis Flow**:
1. User selects AI models and funnel stages
2. System estimates credit cost
3. User confirms and analysis job queued via QStash
4. Background worker processes each model-stage combination
5. Results aggregated and stored with performance metrics
6. User notified via email upon completion

**Progress Tracking**: Real-time analysis status available via polling endpoint showing current task, completed tasks, and overall progress

**Data Aggregation**: Matrix summary endpoint provides pre-computed brand performance across all stage-model combinations for dashboard visualization