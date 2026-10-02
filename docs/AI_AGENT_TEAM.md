# AI Agent Team — Offmap Production Engineering

When scaling beyond solo development, replace hiring with a coordinated team of Claude-powered agents.
Each agent has a defined role, model tier, and toolset. A central Orchestrator routes tasks and synthesises output back to the founder.

## Architecture

```
Founder → Orchestrator (Opus) → routes task → Specialist Agent
                                               ↓
                                      agent uses tools
                                      (reads code, runs bash,
                                       queries DB, searches docs)
                                               ↓
                                 result → Orchestrator → Founder
```

## Agent Roster

### Core Engineering Agents

| Agent | Model | Primary Responsibility | Key Tools |
|-------|-------|----------------------|-----------|
| **Orchestrator** | Opus 4.8 | Receives task, routes to right agent, synthesises output, avoids contradictions across agents | All tools |
| **Architect** | Opus 4.8 | Schema changes, API design, system trade-offs, technology selection, scalability reviews | Read codebase, CLAUDE.md, web search, architecture docs |
| **Product Owner** | Sonnet 4.6 | Backlog prioritisation, user story writing, revenue/effort scoring, feature spec writing | CLAUDE.md, revenue docs, analytics data, user feedback |
| **Tech Developer** | Sonnet 4.6 | Backend feature implementation, API routes, DB migrations, business logic | Read/Edit/Write/Bash/git, Drizzle ORM docs |
| **UI Developer** | Sonnet 4.6 | React components, Tailwind styling, responsive design, accessibility, animations | Read/Edit, screenshot review, design tokens |
| **QA / Tester** | Sonnet 4.6 | Write tests, find edge cases, regression checks, test plan generation, UAT scripts | Bash (run tests), Read, test frameworks |
| **DevOps Agent** | Sonnet 4.6 | CI/CD pipelines, Vercel config, env var management, deploy checks, rollback decisions | Bash, GitHub Actions, Vercel API, env files |
| **Security Auditor** | Opus 4.8 | OWASP top 10 scans, GDPR compliance checks, RLS gap detection, dependency audits | Read codebase, npm audit, web search for CVEs |
| **DB Agent** | Sonnet 4.6 | Query optimisation, migration safety review, index analysis, schema evolution planning | DB schema, slow query logs, Drizzle docs |
| **Monitoring Agent** | Haiku 4.5 | Reads Sentry/Vercel logs hourly, reports anomalies, suggests fixes, escalates P0 issues | Sentry API, Vercel API, Upstash console |

### Business & Operations Agents

| Agent | Model | Primary Responsibility | Key Tools |
|-------|-------|----------------------|-----------|
| **SEO Agent** | Sonnet 4.6 | Metadata audits, Core Web Vitals, structured data (JSON-LD), sitemap, content gaps | Read pages, web search, Vercel Analytics API |
| **Legal / GDPR Agent** | Opus 4.8 | Reviews new features for compliance gaps before shipping, checks data retention, audit logs | Read codebase, GDPR docs, German data law references |
| **Customer Support Agent** | Haiku 4.5 | First-line triage of user emails/tickets, drafts responses, escalates edge cases to founder | Supabase (read user data), email templates, FAQ |
| **Analytics Agent** | Sonnet 4.6 | Reads Vercel/Supabase/Stripe data weekly, produces insight reports, flags anomalies | Vercel API, Supabase API, Stripe API |
| **Content Agent** | Sonnet 4.6 | Email template copy, homepage copy, host onboarding guides, blog posts, social content | CLAUDE.md brand guidelines, existing copy in en.ts |
| **Incident Commander** | Opus 4.8 | On-call: reads alerts, coordinates response across agents, writes postmortems, tracks SLA | Sentry, Betterstack, Vercel, Supabase, Stripe dashboards |

## Tech Stack to Build It

### SDKs & Models
```
Orchestrator, Architect, Security Auditor, Legal, Incident Commander → claude-opus-4-8
All implementation agents → claude-sonnet-4-6
Monitoring, Support, high-frequency agents → claude-haiku-4-5-20251001
```

### Tools each agent needs
```typescript
// Filesystem (available in Claude Code SDK)
Read, Edit, Write, Bash

// External APIs (via tool use)
GitHub API       — PR creation, branch management, CI status
Vercel API       — deploy status, log tailing, rollback
Sentry API       — error query, alert management
Supabase API     — DB queries, auth admin
Stripe API       — subscription status, webhook events
Upstash REST API — Redis cache inspection

// Web
WebSearch        — CVE lookup, library docs, competitor research
WebFetch         — read specific URLs (Sentry alerts, docs)
```

### Integration options
- **Claude Code SDK** — agents run as subprocesses, inherit filesystem access
- **Anthropic API direct** — build a thin coordinator app (Node.js / Next.js API route)
- **Slack integration** — send task to agent via Slack message, result posted back to channel
- **GitHub Actions** — trigger agents on PR open, merge, deploy events

## Task Routing Logic (Orchestrator rules)

| Task type | Route to |
|-----------|----------|
| "Add a new feature" | Architect (design) → Tech Developer (build) → QA (test) |
| "This page looks wrong" | UI Developer |
| "Users are reporting errors" | Monitoring Agent → (if P0) Incident Commander |
| "Is this GDPR compliant?" | Legal/GDPR Agent |
| "Deploy to production" | DevOps Agent |
| "We need a migration" | DB Agent → Tech Developer → DevOps |
| "Write a blog post" | Content Agent |
| "Revenue dropped" | Analytics Agent → Product Owner |
| "Security scan before launch" | Security Auditor |

## Cost Estimate

| Usage level | Approx monthly cost |
|-------------|-------------------|
| Light (few tasks/day, mostly Haiku) | €20–40 |
| Active development (daily agent use) | €80–150 |
| Full autonomous team (continuous monitoring + development) | €200–400 |

Far cheaper than a junior developer (€3,000–5,000/month) for Phase 0–1.

## Build Order

| Step | What | When |
|------|------|------|
| 1 | Security Auditor (one-shot scan before launch) | Now |
| 2 | Monitoring Agent (reads Sentry post-launch) | At first deploy |
| 3 | Tech Developer + UI Developer (feature work) | Phase 1 |
| 4 | DevOps Agent (CI/CD automation) | Phase 1 |
| 5 | Full Orchestrator with routing | Phase 2 |
| 6 | Customer Support Agent | When user volume > 500 |
| 7 | Analytics + Legal Agents | Phase 2 |

## Notes

- Agents share no memory between sessions unless you persist context explicitly (files, DB, Redis)
- For code changes: always review agent output before merging — treat it like a PR from a contractor
- Legal/GDPR Agent output should be reviewed by a human lawyer before acting on it in production
- Monitoring Agent should run on a cron (every 15–60 min), not on-demand
- Multiple agents can run in parallel for independent tasks (UI + Backend simultaneously)

---

*Last updated: 2026-09-25*
*Full platform context: CLAUDE.md*
