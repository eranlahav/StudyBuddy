# Study Buddy - Business Model

**Last Updated:** 2026-01-23

## Revenue Model

### Primary Revenue Stream: B2B Community Licensing

**Core Model:**
- Communities (schools, parent associations, co-ops, municipalities) license Study Buddy for all member families
- Pricing based on community size with volume discounts
- Annual or multi-year contracts (prefer annual for predictability)

**Why B2B Instead of B2C:**
1. **Network effects require critical mass** - Individual families don't get community intelligence value
2. **Lower CAC** - Sell to one community buyer vs hundreds of individual parents
3. **Higher LTV** - Communities have switching costs, annual budgets, lower churn
4. **Institutional trust** - School/community endorsement drives adoption
5. **Viral coefficient** - Communities refer other communities (B2B word of mouth)

### Pricing Tiers

#### Tier 1: Small Community (10-50 Families)
- **Price:** $15/family/month, billed annually ($180/family/year)
- **Community Total:** $1,800-$9,000/year
- **Target:** Homeschool co-ops, small private schools
- **Included:**
  - Full learning profile system
  - AI quiz generation (unlimited)
  - School evaluation OCR (up to 5 per child/year)
  - Parent dashboard with recommendations
  - Community aggregate insights (anonymized)

#### Tier 2: Medium Community (51-200 Families)
- **Price:** $12/family/month, billed annually ($144/family/year)
- **Community Total:** $7,344-$28,800/year
- **Target:** Mid-size schools, active parent associations
- **Included:**
  - Everything in Tier 1
  - School admin dashboard
  - Teacher effectiveness signals (anonymized)
  - Custom subject/topic configuration
  - Priority support

#### Tier 3: Large Community (201-500 Families)
- **Price:** $10/family/month, billed annually ($120/family/year)
- **Community Total:** $24,120-$60,000/year
- **Target:** Large schools, school networks, small municipalities
- **Included:**
  - Everything in Tier 2
  - Cross-school benchmarking (for networks)
  - API access for LMS integration
  - Dedicated account manager
  - Quarterly business review

#### Tier 4: Enterprise (500+ Families)
- **Price:** Custom pricing (typically $7-9/family/month)
- **Community Total:** $42,000+/year
- **Target:** Municipalities, large school networks, regional education departments
- **Included:**
  - Everything in Tier 3
  - White-label options
  - Custom feature development (within reason)
  - SLA guarantees
  - On-premise deployment option (future)

### Usage-Based Add-Ons

**Overage Pricing:**
- School evaluations: $2 per additional evaluation beyond included quota
- Gemini API tokens: $0.50 per 1M tokens beyond free tier (typically ~10,000 quizzes)
- Storage: $0.10/GB/month beyond 1GB per family

**Why Included Quotas + Overages:**
- Predictable base revenue for us
- Predictable base costs for communities
- High-usage families subsidize low-usage (fair distribution)
- Incentivizes efficiency (communities won't abuse AI generation)

## Unit Economics

### Cost Structure (Per Family/Month)

**Variable Costs:**
- Gemini API: ~$1.50/family/month (assumes 20 quizzes × 5 questions, plus eval analysis)
- Firebase Firestore: ~$0.30/family/month (reads/writes, storage)
- Firebase Storage: ~$0.20/family/month (evaluation images, avatars)
- Support: ~$0.50/family/month (amortized across customer base)
- **Total Variable Cost: ~$2.50/family/month**

**Fixed Costs (Amortized):**
- Development: $10,000/month (founder + contractors)
- Marketing: $3,000/month (content, events, tools)
- Infrastructure: $500/month (hosting, CDN, monitoring)
- Admin: $1,500/month (accounting, legal, insurance)
- **Total Fixed Cost: $15,000/month**

**Break-Even Analysis:**
- At Tier 2 pricing ($12/family/month):
  - Gross margin per family: $12 - $2.50 = $9.50/month
  - Families needed to break even: $15,000 / $9.50 = 1,579 families
  - Communities needed (avg 100 families): ~16 communities

### Customer Acquisition Cost (CAC)

**Direct Sales Channel:**
- Sales effort: 20 hours founder time per community closed
- Founder hourly rate (opportunity cost): $100/hour
- Demo/pilot costs: $500 per community (support, customization)
- **CAC: ~$2,500 per community**

**Referral Channel:**
- Referral bonus: $500 per community (paid to referring community admin)
- Setup/onboarding: $200 per community (reduced vs direct sales)
- **CAC: ~$700 per community**

**Target CAC Payback:**
- Tier 2 community (100 families × $12/month): $1,200/month revenue
- Direct sales payback: 2.1 months
- Referral payback: 0.6 months

### Lifetime Value (LTV)

**Assumptions:**
- Average community size: 100 families
- Monthly revenue per community: $1,200 (Tier 2 pricing)
- Average customer lifetime: 3 years (36 months)
- Gross margin: 79% ($9.50 GM / $12 revenue)

**LTV Calculation:**
- LTV = $1,200/month × 36 months × 79% = $34,128 per community

**LTV:CAC Ratios:**
- Direct sales: 34,128 / 2,500 = **13.7x** (excellent)
- Referral: 34,128 / 700 = **48.8x** (exceptional)

### Revenue Projections

#### Year 1 (Pilot + Beta)
- **Q1:** 1 community (pilot, free) = 20 families
- **Q2:** 3 communities (beta pricing $8/family/month) = 60 families → $480/month
- **Q3:** 5 communities (beta pricing) = 100 families → $800/month
- **Q4:** 10 communities (GA pricing $12/family/month) = 200 families → $2,400/month
- **Year 1 Total MRR:** $2,400/month by EOY, $10,800 total annual revenue

#### Year 2 (Growth)
- **Start:** 10 communities, 200 families, $2,400/month MRR
- **Growth:** 5 communities per quarter
- **Q1:** 15 communities, 300 families, $3,600/month
- **Q2:** 20 communities, 400 families, $4,800/month
- **Q3:** 25 communities, 500 families, $6,000/month
- **Q4:** 30 communities, 600 families, $7,200/month
- **Year 2 Total Annual Revenue:** $51,600

#### Year 3 (Scale)
- **Start:** 30 communities, 600 families, $7,200/month MRR
- **Growth:** 10 communities per quarter (referral engine kicks in)
- **Q1:** 40 communities, 800 families, $9,600/month
- **Q2:** 50 communities, 1,000 families, $12,000/month
- **Q3:** 60 communities, 1,200 families, $14,400/month
- **Q4:** 70 communities, 1,400 families, $16,800/month
- **Year 3 Total Annual Revenue:** $159,600

## Business Model Validation

### Key Assumptions to Test

1. **Communities will pay $10-15/family/month** - Validated through pilot pricing experiments
2. **Average community size: 100 families** - Check actual size distribution in target segments
3. **3-year customer lifetime** - Track pilot cohort retention over time
4. **Referral channel scales to 50%+ of new customers** - Measure viral coefficient and referral conversion
5. **Network effects emerge at 10+ families** - Validate that aggregate insights add value at small scale

### Pilot Success Criteria

**Willingness to Pay:**
- At least 1 community (school/parent association) agrees to pay $8-10/family/month after free pilot
- Parent survey shows >70% would recommend to other communities

**Usage Metrics:**
- 50%+ of families use app at least weekly
- Average 3+ quizzes per child per month
- 80%+ parent login rate (view dashboard at least monthly)

**Value Realization:**
- Community admin can articulate specific insights gained from aggregate data
- At least 3 actionable insights delivered per community per month
- Parents report discovering learning gaps they didn't know existed

## Monetization Roadmap

### Phase 1: Validate Core Value (Months 1-6)
- **Pricing:** Free pilot → Discounted beta ($5-8/family/month)
- **Goal:** Prove families use it and communities see value
- **Metric:** 80%+ retention, 50%+ WAU (weekly active users)

### Phase 2: Price Discovery (Months 7-12)
- **Pricing:** Test $10, $12, $15 per family/month with different communities
- **Goal:** Find optimal price point (maximize revenue without high churn)
- **Metric:** Identify price elasticity, measure churn by tier

### Phase 3: Scale Pricing Model (Year 2+)
- **Pricing:** Tiered model (small/medium/large/enterprise)
- **Goal:** Maximize LTV through annual contracts and upsells
- **Metric:** $50K+ MRR, <10% annual churn

### Phase 4: Expand Revenue Streams (Year 3+)
- **New Streams:**
  - Teacher professional development (paid workshops using platform data)
  - Curriculum partnerships (content licensing to publishers)
  - API access for third-party integrations (LMS, gradebook systems)
  - Anonymized research data licensing (universities, government)

## Funding Strategy

### Bootstrap Phase (Current - Month 12)
- **Funding Source:** Founder savings, revenue from first customers
- **Burn Rate:** ~$15K/month (founder living expenses + infrastructure)
- **Runway:** 12 months to profitability (break-even at 16 communities)

### Seed Funding (Optional, Month 12-18)
- **Amount:** $300K-500K
- **Use of Funds:**
  - Hire 1-2 engineers (scale development velocity)
  - Sales/marketing hire (founder focuses on product)
  - 12-18 month runway to Series A metrics
- **Milestones:** 50+ communities, $50K+ MRR, <15% churn

### Series A (Optional, Month 24-36)
- **Amount:** $2M-5M
- **Use of Funds:**
  - Expand to international markets (US, UK, Australia)
  - Build enterprise features (LMS integrations, white-label)
  - Scale GTM team (5-10 sales/marketing hires)
- **Milestones:** 200+ communities, $200K+ MRR, 40%+ gross margins

### Bootstrap vs Raise Decision Point
**Bootstrap if:**
- Can reach 30 communities (600 families, $7K MRR) in 18 months with <$15K/month burn
- Referral channel drives >50% of new customers (low CAC, sustainable growth)
- Founder prefers control and lifestyle business (~$500K-1M annual profit)

**Raise if:**
- Want to blitz scale to 100+ communities in 12 months (winner-take-all dynamics)
- Need engineering team to build enterprise features (API, LMS integrations)
- Competitive threat emerges (large edtech clones community intelligence model)

## Risk Mitigation

### Risk: Communities Won't Pay
**Mitigation:**
- Start with free pilot to prove value
- Offer discounted beta pricing to reduce friction
- Target progressive schools with edtech budgets
- Show ROI calculation (cost per insight, time saved for parents)

### Risk: High Churn (Communities Cancel After Year 1)
**Mitigation:**
- Multi-year discounts (10% off for 2-year contract)
- Quarterly business reviews with community admins
- Continuously ship new features to increase stickiness
- Network effects create switching costs (historical data, community benchmarks)

### Risk: Variable Costs Exceed Projections
**Mitigation:**
- Set Gemini API usage caps per family
- Cache quiz questions to reduce API calls
- Batch processing for evaluation analysis (non-real-time)
- Monitor cost per family weekly, adjust pricing if needed

### Risk: Commoditization (Competitors Undercut on Price)
**Mitigation:**
- Network effects moat (community data compounds over time)
- Lock-in through learning profiles (historical data has value)
- Focus on value differentiation, not price competition
- Premium positioning (charge more, deliver exceptional insights)

---

*This business model synthesizes pricing strategy, unit economics, and revenue projections based on discovery interviews and market analysis conducted on 2026-01-23. Core insight: B2B community licensing model with network effects creates sustainable competitive advantage.*
