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



