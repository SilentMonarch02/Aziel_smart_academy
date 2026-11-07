# Aziel Smart Academy — website

A responsive multi-page website with a real Node.js backend, SQLite enquiry storage, optional email notifications and a protected enquiry dashboard.

## Included pages and functions

- Home, About, Academics, Admissions and Contact pages
- Responsive mobile navigation and shared design system
- Admissions and contact forms with browser validation
- Server-side validation, rate limiting and a honeypot spam field
- Enquiries saved in a local SQLite database (`data/aziel.db`)
- Optional email alerts via SMTP
- Protected admin dashboard at `/admin` and CSV export
- Health endpoint at `/api/health`

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env
```

Edit `.env` and set a long, private `ADMIN_API_KEY`. Then run:

```bash
npm start
```

Open `http://localhost:3000`. The dashboard is at `http://localhost:3000/admin`.

## Before publishing — important school details

The site is complete as a working starter, but the supplied logo was the only school-specific asset/information provided. Replace all sample content before going live:

1. Replace `info@azielacademy.example`, the sample phone number and location on `public/contact.html` and in footer links.
2. Confirm the academy's physical address, office hours, levels/classes, curriculum, fee information, admissions requirements and school history.
3. Add verified staff profiles, school photographs, policies, calendar and any registration/accreditation details that the academy is authorised to publish.
4. Update the `SITE_URL` in `.env`, configure HTTPS on the hosting platform, and set a strong `ADMIN_API_KEY`.
5. If you want email alerts, configure SMTP variables and `NOTIFICATION_EMAIL`. Forms still save to SQLite if email is not configured.
6. Ensure the hosting platform provides persistent storage for `data/aziel.db` and make regular backups. SQLite is suitable for a small school site; use managed PostgreSQL for multi-instance/high-volume deployments.

## Deployment

Deploy to a Node.js host that supports Node 20+, persistent disk storage and environment variables (for example, a VPS or a Node-capable application host). Set the start command to `npm start`, install dependencies during build, and configure the environment variables from `.env.example`. Do not commit `.env` or expose the admin API key.

For a production deployment, use a reverse proxy or hosting platform that provides HTTPS, configure backups and test form submissions and admin access after deployment.

## Privacy and security notes

- Enquiry details may contain personal information. Limit dashboard access, use HTTPS, keep dependencies updated and define a retention/deletion policy.
- Do not collect sensitive learner information in the open enquiry form. Request only what is necessary at this stage.
- Admin authentication uses a server-side bearer secret. Use a long random value, keep it private and rotate it if exposed.
- This starter does not include an online payment gateway, student portal, learning management system, or automated admission decision workflow.
