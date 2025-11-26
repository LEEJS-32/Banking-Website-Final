# System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BANKING SYSTEM                                 │
│                       Fingerprint Scanner Edition                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Tailwind CSS)                   Port: 3001/3000      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Pages:                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Register   │  │   Login     │  │  Dashboard   │  │ Transactions │ │
│  │  (IC OCR)   │  │             │  │              │  │              │ │
│  └─────────────┘  └─────────────┘  └──────────────┘  └──────────────┘ │
│                                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Transfer   │  │  Security   │  │    Admin     │  │    Navbar    │ │
│  │ (Biometric) │  │ (Enroll FP) │  │  Dashboard   │  │              │ │
│  └─────────────┘  └─────────────┘  └──────────────┘  └──────────────┘ │
│                                                                           │
│  Contexts:                                                                │
│  ┌─────────────────────┐  ┌──────────────────────┐                     │
│  │   AuthContext       │  │  BiometricContext    │                     │
│  │ (JWT, User State)   │  │  (WebAuthn)          │                     │
│  └─────────────────────┘  └──────────────────────┘                     │
└───────────────────────┬───────────────────────────────────────────────┘
                        │
                        │ HTTP (Axios)
                        ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Node.js + Express)                        Port: 5000          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Routes:                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ /api/auth    │  │/api/transactions│ │/api/biometric│                │
│  │ (Register/   │  │ (Deposit/      │  │ (WebAuthn    │                │
│  │  Login/IC)   │  │  Withdraw/     │  │  Enroll)     │                │
│  └──────────────┘  │  Transfer)     │  └──────────────┘                │
│                    └──────────────┬─┘                                   │
│  ┌──────────────┐  ┌──────────────┴─┐  ┌──────────────┐                │
│  │/api/fingerprint│ │   /api/admin  │  │ Middleware:  │                │
│  │ (Hardware FP)  │  │ (User/Trans   │  │  - JWT Auth  │                │
│  └────────────┬───┘  │  Management)  │  │  - adminOnly │                │
│               │      └───────────────┘  └──────────────┘                │
│               │                                                          │
│  Controllers: │                                                          │
│  ┌────────────▼──────┐  ┌──────────────┐  ┌──────────────┐            │
│  │fingerprintController│ │authController│  │transactionCtrl│           │
│  │  - enrollFingerprint│ │  - uploadIC  │  │  - transfer  │           │
│  │  - verifyFingerprint│ │  - verifyIC  │  │  - deposit   │           │
│  │  - removeFingerprint│ │  - register  │  │  - withdraw  │           │
│  └──────────┬──────────┘ └──────────────┘  └──────┬───────┘           │
│             │                                       │                   │
│             │ Axios Proxy                           │ Axios              │
│             ↓                                       ↓                   │
│  ┌──────────────────────┐              ┌──────────────────────┐        │
│  │ Fingerprint API      │              │    Fraud API         │        │
│  │   (Flask)            │              │   (Flask)            │        │
│  │  Port: 5002          │              │  Port: 5001          │        │
│  └──────────────────────┘              └──────────────────────┘        │
└──────────────────┬────────────────────────────┬─────────────────────────┘
                   │                            │
                   │                            │
        ┌──────────▼────────┐        ┌─────────▼──────────┐
        │  MongoDB Atlas    │        │  Python Services   │
        │  (Cloud Database) │        └────────────────────┘
        └───────────────────┘
                   │
                   │
        ┌──────────▼─────────────────────────────────────────────────┐
        │  Collections:                                               │
        │  ┌────────────┐  ┌─────────────┐  ┌───────────────┐       │
        │  │   users    │  │transactions │  │   admins      │       │
        │  │ - email    │  │ - type      │  │ - role        │       │
        │  │ - password │  │ - amount    │  │ - permissions │       │
        │  │ - balance  │  │ - sender    │  └───────────────┘       │
        │  │ - icNumber │  │ - recipient │                          │
        │  │ - biometric│  │ - fraudData │                          │
        │  │ - fingerprint│ │ - timestamp │                          │
        │  └────────────┘  └─────────────┘                          │
        └────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  FINGERPRINT API SERVICE (Flask + Python)        Port: 5002             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Endpoints:                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET  /health    → Check scanner connection status              │    │
│  │  POST /enroll    → Capture & store fingerprint                  │    │
│  │  POST /verify    → Capture & match against stored template      │    │
│  │  POST /remove    → Delete stored fingerprint                    │    │
│  │  GET  /list      → List all enrolled users                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Processing Pipeline:                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐                  │
│  │   Capture   │ → │   Convert    │ → │  Normalize  │                  │
│  │ from R307   │   │ to 8-bit     │   │   & CLAHE   │                  │
│  │ (4-bit raw) │   │   grayscale  │   │  enhancement│                  │
│  └─────────────┘   └──────────────┘   └─────────────┘                  │
│         ↓                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐                  │
│  │   Crop      │ → │ Extract SIFT │ → │   FLANN     │                  │
│  │  5px edges  │   │   features   │   │  matching   │                  │
│  └─────────────┘   └──────────────┘   └─────────────┘                  │
│         ↓                                                                 │
│  ┌────────────────────────────────────────────────────┐                 │
│  │ Match Score > 25 ? ✓ Verified : ✗ Failed          │                 │
│  └────────────────────────────────────────────────────┘                 │
│                                                                           │
│  R307 Class:                        Storage:                             │
│  ┌──────────────────────┐          ┌────────────────────┐               │
│  │ - send_cmd()         │          │fingerprint_db.json │               │
│  │ - get_response()     │          │                    │               │
│  │ - capture()          │          │ {                  │               │
│  │ - download()         │          │   "user@email": {  │               │
│  │ - to_image()         │          │     "fingerprint": │               │
│  │                      │          │       "base64...", │               │
│  └──────────────────────┘          │     "enrolled_at": │               │
│                                     │       "2024-01-15" │               │
│  Serial Connection:                 │   }                │               │
│  ┌──────────────────────┐          │ }                  │               │
│  │ Port: COM3           │          └────────────────────┘               │
│  │ Baud: 57600          │                                                │
│  │ Timeout: 1s          │                                                │
│  └──────────────────────┘                                                │
└──────────────────┬────────────────────────────────────────────────────┘
                   │
                   │ Serial Communication (pyserial)
                   ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    R307 FINGERPRINT SCANNER                              │
│                         (Hardware)                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Specifications:                                                          │
│  ┌───────────────────────────────────────────────────────┐              │
│  │  Resolution:   500 DPI                                │              │
│  │  Image Size:   288 x 256 pixels                       │              │
│  │  Interface:    UART (Serial)                          │              │
│  │  Voltage:      DC 3.6V ~ 6.0V                        │              │
│  │  Current:      <120mA                                 │              │
│  │  Capture Time: <1.0 second                           │              │
│  │  LED:          Red (scanning) / Blue (success)       │              │
│  │  Storage:      162 templates (internal flash)        │              │
│  │  FAR:          <0.001% (False Accept Rate)           │              │
│  │  FRR:          <1.0%   (False Reject Rate)           │              │
│  └───────────────────────────────────────────────────────┘              │
│                                                                           │
│  Physical:                                                                │
│  ┌──────────────────┐                                                    │
│  │    ┌────────┐    │                                                    │
│  │    │  LED   │    │ ← Status indicator                                │
│  │    └────────┘    │                                                    │
│  │  ╔════════════╗  │                                                    │
│  │  ║            ║  │ ← Optical sensor window                           │
│  │  ║  [FINGER]  ║  │                                                    │
│  │  ║            ║  │                                                    │
│  │  ╚════════════╝  │                                                    │
│  │   │ │ │ │ │ │    │ ← 6-pin connector                                │
│  └──────────────────┘   (VCC, GND, TX, RX, NC, NC)                      │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  FRAUD DETECTION API (Flask + Python)           Port: 5001              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ML Models:                                                               │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────┐                   │
│  │  XGBoost   │  │  LightGBM   │  │ RandomForest   │                   │
│  │ (Primary)  │  │  (Ensemble) │  │  (Ensemble)    │                   │
│  └────────────┘  └─────────────┘  └────────────────┘                   │
│                                                                           │
│  14 Features:                                                             │
│  - Transaction amount              - Transaction hour                    │
│  - User age                        - Day of week                         │
│  - Account balance                 - User gender                         │
│  - Transaction count               - Merchant category                   │
│  - Country (encoded)               - Bank (encoded)                      │
│  - Shipping address match          - Previous fraud history              │
│  - Transaction velocity            - Amount deviation                    │
│                                                                           │
│  Risk Classification:                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Probability > 0.9  → HIGH RISK   (❌ Block)                     │   │
│  │  0.5 < Prob ≤ 0.9   → MEDIUM RISK (⚠️ Flag for review)          │   │
│  │  Probability ≤ 0.5  → LOW RISK    (✅ Allow)                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  SHAP Explainability:                                                     │
│  Returns top 3 risk factors for each transaction                         │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW - TRANSFER WITH FINGERPRINT                 │
└─────────────────────────────────────────────────────────────────────────┘

  User enters transfer details (amount > $500)
              ↓
  ┌────────────────────────┐
  │  Check biometric status│
  └───────────┬────────────┘
              │
      ┌───────▼──────────┐
      │ Browser OR Scanner│ ← User choice if both enrolled
      │    available?     │
      └───────┬───────────┘
              │
    ┌─────────▼──────────┐
    │  Fingerprint scan  │
    │  requested         │
    └─────────┬──────────┘
              │
              ↓
   Frontend → Backend → Fingerprint API
              ↓                 ↓
        JWT Verify      Capture from R307
              ↓                 ↓
          Valid?         Process image
              ↓                 ↓
           (Yes)         Extract SIFT
              ↓                 ↓
              ├──────→  Match against DB
              ↓                 ↓
       Score > 25?        Return score
              ↓                 ↓
           ✓ Yes         Backend receives
              ↓                 ↓
         Proceed         Update status
              ↓                 ↓
    ┌─────────▼─────────┐      ↓
    │  Fraud Detection  │←─────┘
    │  Analysis (ML)    │
    └─────────┬─────────┘
              │
     ┌────────▼────────┐
     │  Risk < 90%?    │
     └────────┬────────┘
              │
           ✓ Yes
              ↓
    ┌─────────▼─────────┐
    │ Execute Transfer  │
    │ Update Balances   │
    │ Create Transaction│
    └─────────┬─────────┘
              │
              ↓
     ┌────────▼────────┐
     │  Save to MongoDB│
     └────────┬────────┘
              │
              ↓
      ┌───────▼───────┐
      │ Success Message│
      │  + Risk Report │
      └────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYERS                                 │
└─────────────────────────────────────────────────────────────────────────┘

  Layer 1: Authentication
  ┌──────────────────────────────────────┐
  │  JWT Token (httpOnly if cookie)      │
  │  bcrypt Password Hashing (salt=10)   │
  └──────────────────────────────────────┘

  Layer 2: Authorization
  ┌──────────────────────────────────────┐
  │  Role-Based Access Control           │
  │  Protected Routes (middleware)       │
  │  Admin-Only endpoints                │
  └──────────────────────────────────────┘

  Layer 3: Biometric (for high-value transactions >$500)
  ┌──────────────────────────────────────┐
  │  Option A: Browser Biometric         │
  │    - WebAuthn API                    │
  │    - Face ID / Touch ID              │
  │    - Secure Enclave storage          │
  │                                      │
  │  Option B: Hardware Fingerprint      │
  │    - R307 scanner                    │
  │    - SIFT matching (25 threshold)    │
  │    - Local template storage          │
  └──────────────────────────────────────┘

  Layer 4: Fraud Detection (ML-based)
  ┌──────────────────────────────────────┐
  │  XGBoost Model (14 features)         │
  │  Risk Scoring (0-100%)               │
  │  SHAP Explainability                 │
  │  Auto-block high-risk (>90%)         │
  └──────────────────────────────────────┘

  Layer 5: Input Validation
  ┌──────────────────────────────────────┐
  │  Account number format check         │
  │  Amount range validation             │
  │  Description sanitization            │
  │  IC number format validation         │
  └──────────────────────────────────────┘

  Layer 6: Data Protection
  ┌──────────────────────────────────────┐
  │  MongoDB SSL connection              │
  │  Environment variables (.env)        │
  │  CORS configuration                  │
  │  No sensitive data in logs           │
  └──────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                       PORTS & SERVICES SUMMARY                           │
└─────────────────────────────────────────────────────────────────────────┘

  ┌────────┬──────────────────────┬─────────────────────────────────┐
  │  Port  │       Service        │          Purpose                │
  ├────────┼──────────────────────┼─────────────────────────────────┤
  │  3001  │ Frontend (React)     │ User interface                  │
  │  5000  │ Backend (Express)    │ Main API server                 │
  │  5001  │ Fraud API (Flask)    │ ML fraud detection              │
  │  5002  │ Fingerprint (Flask)  │ R307 scanner interface          │
  │  COM3  │ R307 Serial          │ Fingerprint scanner hardware    │
  │ 27017  │ MongoDB Atlas        │ Cloud database (SSL)            │
  └────────┴──────────────────────┴─────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                    STARTUP SEQUENCE                                      │
└─────────────────────────────────────────────────────────────────────────┘

  1. start-all.bat (Windows)
       │
       ├─→ Start Fingerprint API (5002)
       │     └─→ Connect to R307 on COM3
       │     └─→ Load fingerprint_db.json
       │
       ├─→ Start Fraud API (5001)
       │     └─→ Load ML models (XGBoost, LightGBM, RF)
       │     └─→ Initialize SHAP explainer
       │
       ├─→ Start Backend (5000)
       │     └─→ Connect to MongoDB Atlas
       │     └─→ Load routes & middleware
       │     └─→ Test fingerprint API health
       │
       └─→ Start Frontend (3001)
           └─→ Connect to Backend API
           └─→ Initialize React app
           └─→ Load auth context

  2. User Access Flow
       │
       ├─→ Open http://localhost:3001
       │
       ├─→ Register (with IC photo OCR)
       │     └─→ Upload IC photo
       │     └─→ OCR extracts data
       │     └─→ Auto-fill form
       │
       ├─→ Login (JWT token issued)
       │
       ├─→ Go to Security page
       │     └─→ Enroll fingerprint
       │     └─→ Scanner captures & stores
       │
       └─→ Make transfer >$500
           └─→ Fingerprint verification
           └─→ Fraud detection analysis
           └─→ Execute if approved
