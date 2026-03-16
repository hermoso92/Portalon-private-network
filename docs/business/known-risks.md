# Known Risks — Portalon Private Network

## P0 - Critical (Must Fix Before Go-Live)

None outstanding after this audit. All P0 issues have been resolved:
- JWT strategy unified user+partner handling: FIXED (already correct)
- LeadsCRM hardcoded /admin/ route: FIXED
- Pipeline transition validation: FIXED (added VALID_TRANSITIONS)
- HTTP exception filter leaking errors: FIXED

---

## P1 - High (Should Fix in First Sprint)

### AI Scoring is Fire-and-Forget with No Retry
If the AI service fails on first attempt, the lead remains unscored (score: null).
There is no retry queue or scheduled re-scoring job.
**Risk**: Agents may see many unscored leads if AI server is intermittent.
**Mitigation**: Expose the manual "Re-score with AI" button prominently in the UI. Consider adding a cron job to score all leads with null score.

### No Email Notifications
Partners receive no email when their lead changes status or when a commission is created.
**Risk**: Partners don't realize their commission was generated until they log in.
**Mitigation**: Add email notification service (transactional email via Resend/SendGrid) in v2.

### Refresh Token Not Implemented for Partners
Partners receive only an accessToken (15m TTL) from /partners/login. There is no refresh token flow for partners.
**Risk**: Partners are logged out every 15 minutes and must re-authenticate.
**Mitigation**: Implement refresh token for partners (similar to user auth flow) before commercial launch.

### No File Upload for Partner Documents
Partners cannot upload identity documents or signed agreements.
**Risk**: Document collection must happen off-platform (email).
**Mitigation**: Add file upload endpoint in v2 (infrastructure for uploads volume already exists).

---

## P2 - Medium (Backlog)

### Audit Log Has No UI
AuditLog records are created but there is no admin UI to view them.
**Risk**: Admin cannot easily investigate disputes or suspicious activity.
**Mitigation**: Add AuditLog viewer in admin portal.

### No Pagination in Partner's Lead List
Partners with large lead counts may see performance degradation.
**Risk**: Performance issue at scale (>500 leads per partner).
**Mitigation**: Pagination is already implemented in the API. Verify the frontend uses it correctly.

### Commission Calculation Ignores Promotional Discounts
If a unit is sold at a discount (lower than listed price), the commission is calculated on the listed price.
**Risk**: Commission overpayment if discounts are applied.
**Mitigation**: Add actualSalePrice field to Lead model; use it in commission calculation when present.

### No 2FA for Admin Users
Administrators authenticate with password only.
**Risk**: Account takeover via credential stuffing.
**Mitigation**: Add TOTP (Google Authenticator) for SUPER_ADMIN and PROMOTION_MANAGER roles.

### Single Promotion in Seed
The demo data only includes one promotion (El Portalón del Brillante).
**Risk**: Multi-promotion features may be undertested.
**Mitigation**: Add a second promotion in seed data for multi-promotion demo capability.

---

## Known Limitations (By Design)

### Self-Hosted AI Only
The AI system requires a local Ollama installation. Cloud AI APIs (OpenAI, Anthropic) are not supported.
**Impact**: Clients without a GPU server will get default scores only.
**Workaround**: Provide cloud Ollama instance, or add OpenAI provider option.

### Spanish-Language First
The platform is fully in Spanish. No i18n framework is implemented.
**Impact**: International clients (UK, Germany) need a localized version.
**Timeline**: English version is the first i18n priority.

### No Mobile App
The partner portal is web-responsive but there is no native mobile app.
**Impact**: Partners using mobile primarily get a PWA-quality experience.
**Mitigation**: The Next.js app is responsive. Add PWA manifest for install capability.

### Commission Payout is Manual
The platform calculates and tracks commissions but does not initiate bank transfers.
**Impact**: Accounts team must manually process transfers using the approved commission list.
**Future**: Banking API integration (Stripe Connect, GoCardless) for automated payouts.
