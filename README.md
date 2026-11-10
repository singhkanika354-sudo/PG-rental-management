# PG rent management

A simple, single-page website for PG and house owners to manage tenants, monthly rent, electricity bills and other charges, and to send WhatsApp payment reminders. It replaces the paper register.

## Features
- Tenant records: name, phone, room, rent, deposit, joining date
- Monthly bills: electricity (meter units × rate), food/other charges, auto total
- Paid / unpaid tracking with totals for collected and pending amounts
- WhatsApp reminder for one tenant, or a quick list to remind all unpaid tenants
- Month picker, search, and Paid/Unpaid filters
- CSV backup download
- Works on phone and desktop, light and dark mode

## Run locally
Open `index.html` in any browser. No build step or install needed.

## Host free on GitHub Pages
1. Create a new repository on GitHub and upload `index.html` and `README.md`.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. After a minute your site is live at `https://<your-username>.github.io/<repo-name>/`.

## Data storage
Data is saved in the browser's localStorage on the device being used. It is not synced between devices, so use **Download backup (CSV)** regularly.
