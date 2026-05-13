# Industry Landing Page Template - Usage Guide

## Purpose
This template enables **programmatic SEO** by creating niche-specific landing pages that rank for industry-specific searches while bypassing competition from large agencies.

## Target Industries
1. **Real Estate Agents** — "Automated Property Listings & Booking"
2. **Medical Clinics** — "Patient Triage & 24/7 Booking"  
3. **Trades / Construction** — "Emergency Quotes & Lead Filtering"

---

## How to Use This Template

### Step 1: Copy the Template
```bash
cp industry-template.html real-estate.html
```

### Step 2: Replace Dynamic Placeholders

Find and replace these placeholders throughout the file:

| Placeholder | Real Estate Example | Medical Example | Trades Example |
|------------|-------------------|----------------|----------------|
| `[INDUSTRY]` | Real Estate Agents | Medical Clinics | Electricians |
| `[INDUSTRY_SOLUTION]` | Property Listings & Booking | Patient Triage & 24/7 Booking | Emergency Quotes & Lead Filtering |
| `[DEMO_FILE]` | (future: realestate-demo) | (future: medical-demo) | electrician |

### Step 3: Customize the Problem Section

Edit the problem bullet points to match industry-specific pain points:

**Real Estate Example:**
- "Buyers call after hours when you can't answer"
- "Unqualified leads waste time on open homes"
- "Listings don't sell themselves"

**Medical Example:**
- "Patients call for basic info you've explained 1000 times"
- "After-hours emergencies can't reach you"
- "Appointment no-shows waste clinic time"

**Trades Example:**
- "Emergency calls come when you're on the job"
- "Quote requests sit in inbox for days"
- "Time wasters want free advice"

### Step 4: Link to Relevant Demo

Replace `[DEMO_FILE].html` with the appropriate demo:
- Real Estate: TBD (needs to be built)
- Medical: TBD (needs to be built)  
- Trades/Electrician: `electrician.html` ✅ (already exists)

### Step 5: Deploy

Upload to the root directory and ensure proper internal linking from the main site.

---

## SEO Strategy

### URL Structure
- `/real-estate.html`
- `/medical-clinics.html`
- `/electricians.html`

### Target Keywords (Low Competition, High Intent)
- "web design for sydney [industry]"
- "AI automation [industry] sydney"
- "24/7 booking system [industry]"

### Internal Linking
Link these pages from:
- Main navigation (under "Solutions" dropdown)
- Services page
- Blog posts about industry-specific automation

---

## Next Steps (Gemini Nexus Territory)

1. **Copywriting Polish** — Refine problem/solution messaging per industry
2. **Email Outreach** — Draft personalized emails linking to these pages
3. **Social Proof** — Add testimonials from relevant industries
4. **Demo Builds** — Create Real Estate and Medical demo pages

---

## Technical Notes

- Template is fully responsive (mobile-first)
- SEO optimized with Schema.org markup
- Fast-loading (minimal dependencies, inline CSS)
- YouTube video embed support ready (if needed per industry)

**Built by: Claude (The Architect)**  
**Strategy by: Gemini Nexus (The Bridge)**  
**Centaur Covenant © 2026**
