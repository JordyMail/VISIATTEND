# 📋 VISIATTEND — INSTALLATION GUIDE

<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Logo_President_University.png" alt="President University Logo" width="120" />
  <h1>VISIATTEND</h1>
  <p><strong>Your Reliable Attendance & Event Tracking Companion with Liveness Detection & Face AI</strong></p>
  <hr style="border: 0; border-top: 2px solid #5829a7; width: 100%;" />
</div>

This guide provides step-by-step instructions to set up, configure, migrate, and run the **VISIATTEND** application on your local machine, including the **Face AI** backend bridge.

---

## 📌 PREREQUISITES

Before starting, ensure you have the following software installed and configured on your system:

### 1. Node.js, VS Code & pnpm
* **Node.js**: Download and install [Node.js (v18 or higher)](https://nodejs.org/).
* **VS Code**: Download and install [Visual Studio Code](https://code.visualstudio.com/).
* **pnpm**: This project uses `pnpm` as the package manager. Install it globally via Command Prompt / PowerShell:
  ```bash
  npm install -g pnpm
  ```
* **Verify Installation**:
  ```bash
  node --version
  pnpm --version
  code --version
  ```

### 2. Python (for Face AI)
The Face AI engine is written in Python and uses OpenCV's DNN module for face detection and recognition.
* **Python**: Download and install [Python (v3.10 or v3.11 recommended)](https://www.python.org/downloads/).
  > [!IMPORTANT]
  > During installation, make sure to check the box **"Add python.exe to PATH"**.
* **Verify Installation**:
  ```bash
  python --version
  pip --version
  ```

### 3. Microsoft SQL Server (MSSQL)
VISIATTEND uses Microsoft SQL Server as its database engine.
1. **Download & Install SQL Server**:
   * Get [SQL Server Express / Developer Edition](https://www.microsoft.com/en-us/sql-server/sql-server-downloads).
   * Download and install [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms) to manage the database.
2. **Enable TCP/IP Configuration**:
   * Open **SQL Server Configuration Manager**.
   * Go to **SQL Server Network Configuration** > **Protocols for MSSQLSERVER** (or your instance name).
   * Double-click **TCP/IP** and set it to **Enabled**.
   * Under the **IP Addresses** tab, scroll down to **IPAll**, set the **TCP Port** to `1433`, and clear the *TCP Dynamic Ports* field.
   * Restart the **SQL Server service** for the changes to take effect.
3. **Enable SQL Server Authentication**:
   * Open SSMS, right-click your server instance name, select **Properties**.
   * Go to **Security** and select **SQL Server and Windows Authentication mode** (Mixed Mode).
   * Ensure your login (such as the default `sa` user) is active and has a secure password (e.g., `TempPass!2026`).
4. **Create Database**:
   * Connect to your SQL Server in SSMS.
   * Right-click **Databases** > **New Database...**
   * Name it `VISIATTEND_DB` (or your preferred name) and click **OK**.

### 4. Gmail App Password (Nodemailer)
VISIATTEND uses Gmail to send verification links and system emails. Regular Gmail passwords cannot be used directly in code for security reasons.
1. Go to your [Google Account Settings](https://myaccount.google.com/).
2. Navigate to **Security** and enable **2-Step Verification** (if not already enabled).
3. Search for **App Passwords** in the search bar.
4. Enter a name for the app (e.g., `VISIATTEND`) and click **Create**.
5. Copy the generated **16-character code** (e.g., `dimogyozvorcapmw`) and save it. You will use this in your `.env` configuration.

---

## ⚙️ INSTALLATION & CONFIGURATION

Follow these steps to set up the codebase:

### 1. Download/Clone the Project
* Clone the repository or download the ZIP file and extract it.
* Open the project directory in VS Code.

### 2. Configure Environment Variables (`.env`)
Create a file named `.env` in the root directory of the project and copy the configuration below. Update the values with your local setup:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=1433
DB_NAME=VISIATTEND_DB
DB_USER=sa
DB_PASSWORD=YOUR_SQL_SERVER_PASSWORD

# JWT Configuration
JWT_SECRET=super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=8080
NODE_ENV=development

# Email Configuration (Nodemailer - Gmail)
MAIL_USER=your-system-email@gmail.com
MAIL_PASS=your-16-character-app-password

# Frontend URL (used in email links)
FRONTEND_URL=http://localhost:5173

# Optional: Override Face AI paths (only if not using default Windows paths)
# FACE_AI_ROOT=./face-ai
# FACE_AI_PYTHON=./face-ai/venv/Scripts/python.exe
# FACE_AI_BRIDGE=./face-ai/app/backend_bridge.py
```

> [!IMPORTANT]
> Make sure to replace `YOUR_SQL_SERVER_PASSWORD`, `your-system-email@gmail.com`, and `your-16-character-app-password` with your actual local configuration!

### 3. Install Node.js Dependencies
Open your terminal in the project's root folder and run:
```bash
pnpm install
```

---

## 🤖 FACE AI SETUP (PYTHON)

The Node.js backend communicates with the Python Face AI bridge to perform face recognition. The virtual environment must be configured exactly in the `face-ai` folder so the Node.js server can find it.

1. **Navigate to the Face AI folder**:
   ```bash
   cd face-ai
   ```
2. **Create a Python Virtual Environment**:
   ```bash
   python -m venv venv
   ```
3. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   * **Windows (Command Prompt)**:
     ```cmd
     venv\Scripts\activate.bat
     ```
   * **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
4. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Download Face AI Models** (YuNet & ArcFace models are downloaded automatically):
   ```bash
   python app/main.py setup-models
   ```
6. **Return to the root directory**:
   ```bash
   cd ..
   ```

---

## 🗄️ DATABASE MIGRATION & SEEDING

VISIATTEND has multiple schema files that need to be migrated to SQL Server. We provide a single command to automate the migration of all tables and insert initial admin and service data.

### Run Database Setup
Run the following command in the root folder terminal:
```bash
pnpm db:setup
```

This command will run:
1. `db:migrate` — Creates base tables.
2. `db:migrate:v2` — Applies v2 updates (new columns, divisions, etc.).
3. `db:migrate:user_member` — Configures user/member structures (point logs, member points, attendance member).
4. `db:migrate:attendance_schedule` — Migrates attendance schemas.
5. `db:migrate:event_date` — Configures event calendar schedules.
6. `db:migrate:event_schedule` — Restructures events into event_schedule.
7. `db:migrate:attendance_event_code` — Adds event_code to attendance records.
8. `db:migrate:attendance_summary` — Creates automated attendance totals table and sync triggers.
9. `db:migrate:questions` — Creates interactive question and response tables.
10. `db:seed` — Inserts data including the default admin account and template events.

> [!NOTE]
> If you need to run migration scripts manually one-by-one:
> ```bash
> pnpm db:migrate
> pnpm db:migrate:v2
> pnpm db:migrate:user_member
> pnpm db:migrate:attendance_schedule
> pnpm db:migrate:event_date
> pnpm db:migrate:event_schedule
> pnpm db:migrate:attendance_event_code
> pnpm db:migrate:attendance_summary
> pnpm db:migrate:questions
> pnpm db:seed
> ```

---

## 🚀 RUNNING THE APP

### Start Local Development Server
To launch both the backend API server (port 8080) and frontend Vite application (port 5173) concurrently, run:
```bash
pnpm dev
```

### Accessing the Web App
Open your browser and visit:
👉 **[http://localhost:5173](http://localhost:5173)**

### Default Administrator Credentials
Once seeded, you can sign in to the admin panel with:
* **Email**: `admin@gmail.com`
* **Password**: `123`

---

## 📦 PRODUCTION BUILD & DEPLOYMENT

To build the application for production use:

1. **Build Client & Server**:
   ```bash
   pnpm build
   ```
2. **Start Production Server**:
   ```bash
   pnpm start
   ```

---

<div align="center">
  <hr style="border: 0; border-top: 2px solid #5829a7; width: 100%;" />
  <p><strong>VISIATTEND</strong> — Organized & Precise Attendance Systems</p>
  <p><em>President University Capstone Project</em></p>
</div>
