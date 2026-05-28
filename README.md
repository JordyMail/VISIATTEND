# VISIATTEND

Instalation:
npm install
npx shadcn-ui@latest add command checkbox
npx shadcn-ui@latest add alert-dialog card label
npm install js-cookie crypto-js
npm install @types/js-cookie @types/crypto-js
npm install framer-motion

# Backend/server

### perlu diinstall sebelum (pnpm run db:seed)
pnpm add mssql bcrypt jsonwebtoken
pnpm add -D @types/bcrypt @types/jsonwebtoken

### perlu diinstall sebelum (pnpm run db:migrate)
pnpm add mssql
pnpm approve-builds

---------
# 1. Install dependencies
pnpm install

# 2. Buat database dan tabel
pnpm run db:migrate

# 3. Isi data awal
pnpm run db:seed

# 4. Jalankan development server
pnpm run dev


# Build backend (cukup sekali, atau ulang jika ada perubahan)
pnpm run build:server

# Jalankan backend server
pnpm run start

<!-- FINAL  -->
# Build ulang
pnpm run build

# Jalankan server
pnpm run start

pnpm add -D ts-node


## How to run

```bash
# 1. Setup DB (run once)
pnpm db:migrate
pnpm db:seed

npm run db:migrate:v2
npm run db:seed:v2

# 2. Start dev server
pnpm dev
```

Default admin credentials (from seed):
- Email: `admin@gmail.com`
- Password: `123`

---

## PDF export note
PDF export uses the browser's native **print dialog** (window.open + print()).
This works in all browsers without installing extra packages.
If you want server-side PDF generation later, install `pdfkit` or `puppeteer`
and add a `/api/reports/:id/download` endpoint that streams a PDF buffer.

# Di terminal client folder
cd C:\Users\JORDY\OneDrive\Documents\GitHub\VISIATTEND\client
npm run dev:frontend

# backend
cd C:\Users\JORDY\OneDrive\Documents\GitHub\VISIATTEND\server
npm run dev:api
