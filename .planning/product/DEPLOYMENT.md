# Study Buddy - Technical Infrastructure & Deployment

**Last Updated:** 2026-01-23

## Current Deployment Architecture

### Hosting Platform: Firebase

**Firebase Hosting:**
- Static site hosting (Vite-built React SPA)
- Build directory: `dist/`
- CDN-backed with automatic SSL
- Deploy command: `firebase deploy`
- Rewrite rules: SPA routing (all paths → `/index.html`)

**Deployment Method:**
- **Manual:** Developer runs `firebase deploy` from local machine
- **No CI/CD:** No automated production deployments
- **GitHub Actions:** Used only for Claude Code integration, not production

**Configuration Files:**
- `firebase.json` - Hosting and security rules configuration
- `.firebaserc` - Project aliases (default project configured)

### Database: Firebase Firestore

**Architecture:**
- NoSQL document database
- Real-time subscriptions via `onSnapshot` listeners
- Multi-tenant data isolation (all queries scoped by `familyId`)

**Collections:**
```
/families/{familyId}
/parents/{parentId}
/invites/{inviteId}
/children/{childId}
  └─ /learnerProfile/{profileId}  (subcollection)
/subjects/{subjectId}
/sessions/{sessionId}
/upcomingTests/{testId}
/evaluations/{evaluationId}
/learningGoals/{goalId}
/recommendations/{recommendationId}
```

**Security Rules:**
- `firestore.rules` - Family-scoped data access (users can only read/write own family data)
- Admin override for super admin email (hardcoded in types.ts)

### Authentication: Firebase Auth

**Method:**
- Email/password authentication
- Mock mode for development (admin/admin hardcoded in store.tsx)
- Session persistence via localStorage

**User Roles:**
- Super Admin (SUPER_ADMIN_EMAIL in types.ts)
- Parent (family member with admin rights)
- Child (read-only family member)

### Storage: Firebase Storage

**Purpose:**
- School evaluation uploads (images/PDFs)
- Child avatars
- Family logos (future)

**Security Rules:**
- `storage.rules` - Family-scoped access (users can only access own family files)
- Path structure: `/families/{familyId}/evaluations/{fileName}`

### AI Integration: Google Gemini API

**Model:** `gemini-1.5-flash` (fast, cost-effective)

**API Key:**
- Stored in `.env.local` (not checked into git)
- Environment variable: `GEMINI_API_KEY`
- Client-side API calls (no backend proxy)

**Features:**
- Quiz question generation (multi-turn conversation)
- Evaluation OCR and analysis (multimodal input)
- Topic extraction from text/images
- Mistake analysis and recommendations

**Cost Model:**
- Pay-per-use (no monthly minimum)
- Pricing: ~$0.001 per 1,000 input tokens, ~$0.002 per 1,000 output tokens
- Estimated: $1.50/family/month based on 20 quizzes × 5 questions

## Cost Analysis

### Current Costs (Single Family)

**Firebase Costs:**
- Hosting: Free tier (10 GB bandwidth, 1 GB storage)
- Firestore: Free tier (50K reads, 20K writes, 1 GB storage per day)
- Storage: Free tier (5 GB total, 1 GB downloads/day)
- Auth: Free tier (unlimited users)

**Gemini API:**
- Current usage: ~$5-10/month (development + single family testing)
- Production estimate: $1.50/family/month

**Total Current Costs:** ~$5-10/month (all within free tiers except Gemini)

### Projected Costs at Scale

#### 100 Families (Phase 1 Target)
- Firebase Firestore: $25/month (read/write operations)
- Firebase Storage: $10/month (evaluation image storage)
- Firebase Hosting: $0 (still within free tier)
- Gemini API: $150/month (100 families × $1.50)
- **Total: ~$185/month ($1.85/family)**

#### 500 Families (Phase 2 Target)
- Firebase Firestore: $100/month
- Firebase Storage: $40/month
- Firebase Hosting: $10/month
- Gemini API: $750/month (500 families × $1.50)
- Monitoring/Observability: $50/month (Firebase Analytics, error tracking)
- **Total: ~$950/month ($1.90/family)**

#### 1,500 Families (Phase 3 Target)
- Firebase Firestore: $250/month
- Firebase Storage: $100/month
- Firebase Hosting: $30/month
- Gemini API: $2,250/month (1,500 families × $1.50)
- Monitoring: $100/month
- CDN/Performance: $70/month
- **Total: ~$2,800/month ($1.87/family)**

**Cost Efficiency:** Variable costs scale linearly (~$1.85-1.90/family/month across all scales)

## Scalability Analysis

### Current Bottlenecks

1. **Client-Side Gemini API Calls**
   - **Issue:** API key exposed in client (security risk at scale)
   - **Limit:** Rate limits apply per API key (not per user)
   - **Fix:** Proxy through serverless backend (Cloud Functions)

2. **No Caching Layer**
   - **Issue:** Duplicate quiz questions generated (waste API tokens)
   - **Limit:** High API costs for repeat topics
   - **Fix:** Cache generated questions in Firestore (with TTL)

3. **Real-Time Subscriptions for All Data**
   - **Issue:** Every user has onSnapshot listeners for all collections
   - **Limit:** High read operations, potential Firestore cost explosion
   - **Fix:** Optimize subscriptions (only listen to relevant documents)

4. **Manual Deployment**
   - **Issue:** Developer must manually deploy (doesn't scale with team)
   - **Limit:** Single point of failure, no rollback mechanism
   - **Fix:** GitHub Actions CI/CD for automated deployments

### Scaling Plan

#### Phase 1: Optimize Current Architecture (0-100 Families)
- **Backend Proxy:** Cloud Functions for Gemini API (hide key, add caching)
- **Question Caching:** Store generated questions in Firestore (reduce API calls 50%)
- **Subscription Optimization:** Lazy-load collections (don't subscribe until needed)
- **CI/CD:** GitHub Actions for automated Firebase deploy on merge to main

#### Phase 2: Introduce Backend Services (100-500 Families)
- **Serverless Backend:** Cloud Functions for:
  - Gemini API proxy (with rate limiting per family)
  - Background jobs (profile updates, recommendations)
  - Webhook handlers (payment processing, admin actions)
- **Database Optimization:**
  - Composite indexes for common queries
  - Denormalization for read-heavy data (e.g., child stats)
  - Batch writes for profile updates (reduce write ops)

#### Phase 3: Distributed Architecture (500+ Families)
- **Microservices:**
  - Quiz generation service (dedicated Cloud Run container)
  - OCR/evaluation analysis service (separate Gemini API quota)
  - Recommendation engine service (batch processing nightly)
- **Caching Layer:**
  - Redis/Memcached for hot data (leaderboards, recent sessions)
  - CDN caching for static content (quiz questions, subject data)
- **Monitoring:**
  - Firebase Performance Monitoring
  - Cloud Logging with structured queries
  - Alerting on error rates, API costs, latency

## Security Considerations

### Current Security Posture

**Strengths:**
- Multi-tenant data isolation (familyId scoping)
- Firebase security rules enforce access control
- HTTPS by default (Firebase Hosting)
- Email verification for new accounts

**Weaknesses:**
1. **API Key Exposure:** Gemini API key in client code (visible in network tab)
2. **No Rate Limiting:** User can spam API (high costs)
3. **Mock Auth in Development:** admin/admin hardcoded (easy to forget to disable)
4. **No Input Sanitization:** User-provided topics/questions not validated
5. **No CORS Restrictions:** Any origin can call Firebase (low risk with auth, but not ideal)

### Security Roadmap

#### Immediate (Pre-Pilot)
- Move Gemini API key to backend (Cloud Functions proxy)
- Remove mock auth or gate behind environment variable
- Add input sanitization (topic names, question text)
- Enable Firebase App Check (bot protection)

#### Short-Term (Pilot Phase)
- Implement rate limiting (API calls per family per day)
- Add CORS restrictions (only allow production domain)
- Set up security monitoring (Firebase Auth anomaly detection)
- Audit Firestore security rules (penetration test)

#### Long-Term (Scale Phase)
- DDoS protection (Cloud Armor)
- PII encryption at rest (evaluation images, parent notes)
- Compliance certifications (GDPR, COPPA if expanding to EU/US)
- Security audit by third party

## DevOps & Monitoring

### Current Monitoring

**Limited Observability:**
- No error tracking (other than browser console)
- No performance monitoring
- No cost tracking (manual Firebase billing review)
- No uptime monitoring

### Monitoring Roadmap

#### Phase 1: Basic Observability
- **Error Tracking:** Sentry or Firebase Crashlytics (client-side errors)
- **Performance:** Firebase Performance Monitoring (page load, API latency)
- **Logging:** Structured logging in Cloud Functions (when added)
- **Alerts:** Firebase billing alerts (daily cost threshold)

#### Phase 2: Production-Grade Monitoring
- **Uptime Monitoring:** External service (Pingdom, UptimeRobot)
- **APM:** Application Performance Monitoring (Cloud Trace)
- **Cost Tracking:** Automated cost analysis (Firebase + Gemini per family)
- **User Analytics:** Firebase Analytics (DAU, MAU, feature usage)

#### Phase 3: Full Observability Stack
- **Distributed Tracing:** Track requests across microservices
- **Log Aggregation:** Centralized logging (Cloud Logging)
- **Custom Dashboards:** Grafana/Looker Studio for business metrics
- **Incident Response:** PagerDuty integration for critical alerts

## Deployment Checklist (Pre-Pilot)

**Infrastructure:**
- [ ] Cloud Functions deployed for Gemini API proxy
- [ ] CI/CD pipeline configured (GitHub Actions → Firebase)
- [ ] Firebase App Check enabled (bot protection)
- [ ] Firestore security rules audited and tightened

**Monitoring:**
- [ ] Sentry configured for error tracking
- [ ] Firebase Performance Monitoring enabled
- [ ] Billing alerts set ($100/month threshold)
- [ ] Uptime monitoring for production URL

**Security:**
- [ ] API keys moved to backend (no client exposure)
- [ ] Rate limiting implemented (per family, per day)
- [ ] Input sanitization on all user-provided text
- [ ] Mock auth disabled (or gated by environment variable)

**Documentation:**
- [ ] Deployment runbook (how to deploy, rollback)
- [ ] Incident response plan (who to contact, escalation)
- [ ] Cost projection model (update with actual usage data)
- [ ] Security policy documented (data handling, access control)

## Future Considerations

### Multi-Region Deployment (Global Expansion)
- Deploy Firebase projects per region (US, EU, Asia-Pacific)
- Geo-routing based on user location
- GDPR compliance for EU users (data residency)

### Hybrid/On-Premise (Enterprise Customers)
- Docker containers for self-hosted deployment
- Firestore emulator for local data (air-gapped environments)
- License key validation (vs SaaS subscription)

### White-Label Options (Large Communities)
- Custom domain per community (community.studybuddy.co)
- Branded UI (community logo, colors)
- Isolated Firebase projects (data residency per customer)

---

*This deployment analysis documents current infrastructure (Firebase Hosting, Firestore, Storage, Gemini API) and projected scaling needs based on technical review conducted on 2026-01-23.*
