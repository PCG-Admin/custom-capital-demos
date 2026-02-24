# Custom Capital workflows

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pcgs-projects-8758c50f/v0-custom-capital-workflows)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/uugmiMBscpz)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Workflow users & login

- The database migrations now create a `users` table for workflow-aligned operators with plain-text `password_hash` values (hashing can be added later once the login flow is wired up).
- Each user is tagged with a `role`, `responsible_workflow` (`rental_credit_application`), and the exact workflow `responsible_step` they own, including contact metadata for UI surfacing.
- `scripts/002_insert_sample_data.sql` seeds mock users that map 1:1 with every step plus a platform administrator (`admin@customcapital.com` / `admin123`) who can act on every stage. The fixture also includes an example rental agreement PDF attached to the first approved application so you can preview the generated output locally.
- Rental agreements are no longer uploaded manually. Once the workflow finishes with an approval decision, the system generates a PDF that mirrors the sample in `/public/Rental-agreement.pdf`, stores it in Supabase storage, and surfaces the download link in the workflow detail view and dashboards.
- A branded login/logout experience now gates the dashboard: `/login` authenticates against the seeded users, the workflows hub shows the signed-in operator + logout button, and workflow actions are locked down so operators can only update the steps they own (admins can update every stage).
- When Supabase env vars are missing (e.g., preview deployments), the `/api/login` route automatically falls back to the seeded mock users so QA credentials continue to work. `/contact` and `/reset-password` routes provide simple support messaging for the links exposed on the auth screen.

## Deployment

Your project is live at:

**[https://vercel.com/pcgs-projects-8758c50f/v0-custom-capital-workflows](https://vercel.com/pcgs-projects-8758c50f/v0-custom-capital-workflows)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/uugmiMBscpz](https://v0.app/chat/uugmiMBscpz)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
