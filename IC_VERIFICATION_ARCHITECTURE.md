# IC Verification System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Front IC    │         │   Back IC    │                     │
│  │   Upload     │         │   Upload     │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ Tesseract.js │         │ Tesseract.js │                     │
│  │  OCR Engine  │         │  OCR Engine  │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                              │
│         ├────────────────────────┤                              │
│         │                        │                              │
│         ▼                        ▼                              │
│  ┌────────────────────────────────────────┐                    │
│  │    Data Extraction & Validation        │                    │
│  │  • IC Number    • Name    • Address    │                    │
│  └────────────────┬───────────────────────┘                    │
│                   │                                             │
│                   ▼                                             │
│        ┌──────────────────────┐                                │
│        │  Verify Complete IC  │                                │
│        │   (API Call)         │                                │
│        └──────────┬───────────┘                                │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    │ HTTP POST
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────┐         │
│  │            Auth Controller                         │         │
│  │  • verifyIC()                                      │         │
│  │  • verifyICDatabase()                              │         │
│  │  • verifyICComplete() ◄─── Entry Point             │         │
│  │  • uploadIC()                                      │         │
│  └───────────────┬───────────────────────────────────┘         │
│                  │                                              │
│                  ▼                                              │
│  ┌───────────────────────────────────────────────────┐         │
│  │         IC Verification Service                    │         │
│  │  ┌─────────────────────────────────────┐          │         │
│  │  │ 1. Cross-Verify Front & Back IC     │          │         │
│  │  │    • IC numbers match?               │          │         │
│  │  └─────────────┬────────────────────────┘          │         │
│  │                │                                    │         │
│  │                ▼                                    │         │
│  │  ┌─────────────────────────────────────┐          │         │
│  │  │ 2. Database Lookup                   │          │         │
│  │  │    • Load mockICDatabase.json        │◄─────────┼─────┐  │
│  │  │    • Search by IC number             │          │     │  │
│  │  └─────────────┬────────────────────────┘          │     │  │
│  │                │                                    │     │  │
│  │                ▼                                    │     │  │
│  │  ┌─────────────────────────────────────┐          │     │  │
│  │  │ 3. Status Checks                     │          │     │  │
│  │  │    ✓ Valid IC                        │          │     │  │
│  │  │    ✗ Blacklisted                     │          │     │  │
│  │  │    ✗ Revoked                         │          │     │  │
│  │  │    ✗ Not Found                       │          │     │  │
│  │  └─────────────┬────────────────────────┘          │     │  │
│  │                │                                    │     │  │
│  │                ▼                                    │     │  │
│  │  ┌─────────────────────────────────────┐          │     │  │
│  │  │ 4. Data Validation                   │          │     │  │
│  │  │    • Name matching                   │          │     │  │
│  │  │    • Address matching                │          │     │  │
│  │  │    • Security features               │          │     │  │
│  │  └─────────────┬────────────────────────┘          │     │  │
│  │                │                                    │     │  │
│  │                ▼                                    │     │  │
│  │  ┌─────────────────────────────────────┐          │     │  │
│  │  │ 5. Duplicate Check                   │          │     │  │
│  │  │    • Check User model                │◄─────────┼─────┼─┐│
│  │  │    • IC already registered?          │          │     │ ││
│  │  └─────────────┬────────────────────────┘          │     │ ││
│  │                │                                    │     │ ││
│  │                ▼                                    │     │ ││
│  │  ┌─────────────────────────────────────┐          │     │ ││
│  │  │ 6. Return Verification Result        │          │     │ ││
│  │  │    • verified: true/false            │          │     │ ││
│  │  │    • status: success/failed          │          │     │ ││
│  │  │    • data: IC details                │          │     │ ││
│  │  └─────────────┬────────────────────────┘          │     │ ││
│  └────────────────┼─────────────────────────────────────┘     │ ││
│                   │                                          │ ││
└───────────────────┼──────────────────────────────────────────┼─┼┘
                    │                                          │ │
                    ▼                                          │ │
      ┌──────────────────────────┐                            │ │
      │    Mock IC Database      │◄───────────────────────────┘ │
      │  (mockICDatabase.json)   │                              │
      ├──────────────────────────┤                              │
      │  • validICs: [...]       │                              │
      │  • blacklistedICs: [...]  │                              │
      │  • revokedICs: [...]     │                              │
      └──────────────────────────┘                              │
                                                                 │
      ┌──────────────────────────┐                              │
      │     User Database        │◄─────────────────────────────┘
      │    (MongoDB/MySQL)       │
      ├──────────────────────────┤
      │  • Check if IC exists    │
      │  • Prevent duplicates    │
      └──────────────────────────┘
```

## Verification Flow Diagram

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Upload Front IC Image
       ▼
┌──────────────────┐
│  OCR Processing  │
│  (Tesseract.js)  │
└──────┬───────────┘
       │
       │ Extracted: IC Number, Name
       ▼
┌──────────────────┐
│  Store Front     │
│  Data            │
└──────┬───────────┘
       │
       │ 2. Upload Back IC Image
       ▼
┌──────────────────┐
│  OCR Processing  │
│  (Tesseract.js)  │
└──────┬───────────┘
       │
       │ Extracted: IC Number, Address
       ▼
┌──────────────────┐
│  Store Back      │
│  Data            │
└──────┬───────────┘
       │
       │ 3. Click "Verify with Database"
       ▼
┌──────────────────────────────────────────────┐
│          VERIFICATION PROCESS                 │
├──────────────────────────────────────────────┤
│                                               │
│  Step 1: Cross-Verify                        │
│  ┌────────────────────────────────┐          │
│  │ Front IC = Back IC ?           │          │
│  │ 950815145678 = 950815145678 ✓  │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ YES                        │
│                  ▼                            │
│  Step 2: Database Lookup                     │
│  ┌────────────────────────────────┐          │
│  │ Search in mockICDatabase.json  │          │
│  │ IC: 950815145678               │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ FOUND                      │
│                  ▼                            │
│  Step 3: Status Check                        │
│  ┌────────────────────────────────┐          │
│  │ Status: active ✓               │          │
│  │ Not blacklisted ✓              │          │
│  │ Not revoked ✓                  │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ VALID                      │
│                  ▼                            │
│  Step 4: Name Matching                       │
│  ┌────────────────────────────────┐          │
│  │ Scanned: AHMAD BIN ABDULLAH    │          │
│  │ Database: AHMAD BIN ABDULLAH   │          │
│  │ Match: ✓                       │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ MATCH                      │
│                  ▼                            │
│  Step 5: Address Matching                    │
│  ┌────────────────────────────────┐          │
│  │ Similarity Score: 0.85         │          │
│  │ Threshold: 0.50                │          │
│  │ Pass: ✓                        │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ PASS                       │
│                  ▼                            │
│  Step 6: Duplicate Check                     │
│  ┌────────────────────────────────┐          │
│  │ Check User Database            │          │
│  │ IC 950815145678 exists?        │          │
│  │ No: ✓                          │          │
│  └────────────────────────────────┘          │
│                  │                            │
│                  │ NOT FOUND (Good!)          │
│                  ▼                            │
│  ┌────────────────────────────────┐          │
│  │   ✓ VERIFICATION SUCCESS       │          │
│  │                                 │          │
│  │   Return Verified Data:         │          │
│  │   • IC Number                   │          │
│  │   • Full Name                   │          │
│  │   • Gender, DOB                 │          │
│  │   • Birth Place                 │          │
│  │   • Address                     │          │
│  │   • All security checks passed  │          │
│  └────────────────────────────────┘          │
│                                               │
└───────────────────┬───────────────────────────┘
                    │
                    │ Return to Frontend
                    ▼
         ┌──────────────────────┐
         │   AUTO-FILL FORM     │
         │   • Name             │
         │   • Gender           │
         │   • Date of Birth    │
         │   • IC Number        │
         └──────────────────────┘
                    │
                    │ User Completes Form
                    ▼
         ┌──────────────────────┐
         │   REGISTER USER      │
         │   with Verified IC   │
         └──────────────────────┘
```

## Error Scenarios

```
┌──────────────────────────────────────────────┐
│            FAILURE SCENARIOS                  │
├──────────────────────────────────────────────┤
│                                               │
│  Scenario 1: IC Numbers Don't Match          │
│  ┌────────────────────────────────┐          │
│  │ Front: 950815145678            │          │
│  │ Back:  880422083456            │          │
│  │ Result: ✗ MISMATCH             │          │
│  │ Error: "IC numbers don't match"│          │
│  └────────────────────────────────┘          │
│                                               │
│  Scenario 2: Blacklisted IC                  │
│  ┌────────────────────────────────┐          │
│  │ IC: 901010142345               │          │
│  │ Status: BLACKLISTED            │          │
│  │ Reason: "Reported stolen"      │          │
│  │ Result: ✗ VERIFICATION FAILED  │          │
│  └────────────────────────────────┘          │
│                                               │
│  Scenario 3: Revoked IC                      │
│  ┌────────────────────────────────┐          │
│  │ IC: 780305149999               │          │
│  │ Status: REVOKED                │          │
│  │ Reason: "Deceased"             │          │
│  │ Result: ✗ VERIFICATION FAILED  │          │
│  └────────────────────────────────┘          │
│                                               │
│  Scenario 4: IC Not in Database              │
│  ┌────────────────────────────────┐          │
│  │ IC: 123456789012               │          │
│  │ Status: NOT FOUND              │          │
│  │ Result: ✗ INVALID IC           │          │
│  │ Error: "IC not found in        │          │
│  │         government database"   │          │
│  └────────────────────────────────┘          │
│                                               │
│  Scenario 5: Already Registered              │
│  ┌────────────────────────────────┐          │
│  │ IC: 950815145678               │          │
│  │ Check: User Database           │          │
│  │ Result: FOUND                  │          │
│  │ Error: "IC already registered" │          │
│  └────────────────────────────────┘          │
│                                               │
│  Scenario 6: Under 18                        │
│  ┌────────────────────────────────┐          │
│  │ IC: 101225145678               │          │
│  │ DOB: 2010-12-25                │          │
│  │ Age: 14 years                  │          │
│  │ Result: ✗ TOO YOUNG            │          │
│  │ Error: "Must be 18+ to         │          │
│  │         register"              │          │
│  └────────────────────────────────┘          │
│                                               │
└──────────────────────────────────────────────┘
```

## Data Flow

```
┌────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                │
└────────────────────────────────────────────────────────────────┘

Front IC OCR
    │
    ├─► IC Number: "950815145678"
    ├─► Full Name: "AHMAD BIN ABDULLAH"
    ├─► First Name: "AHMAD"
    └─► Last Name: "BIN ABDULLAH"
         │
         ▼
Back IC OCR
    │
    ├─► IC Number: "950815145678"
    └─► Address: "NO. 123, JALAN BUKIT BINTANG, 50200 KUALA LUMPUR"
         │
         ▼
Combine & Send to Backend
    {
      frontData: {
        icNumber: "950815145678",
        fullName: "AHMAD BIN ABDULLAH",
        firstName: "AHMAD",
        lastName: "BIN ABDULLAH"
      },
      backData: {
        icNumber: "950815145678",
        address: "NO. 123, JALAN BUKIT BINTANG, 50200 KUALA LUMPUR"
      }
    }
         │
         ▼
Backend Verification
    {
      verified: true,
      status: "fully_verified",
      message: "IC fully verified - front, back, and database match",
      data: {
        icNumber: "950815145678",
        fullName: "AHMAD BIN ABDULLAH",
        gender: "M",
        dateOfBirth: "1995-08-15",
        birthPlace: "Negeri Sembilan",
        nationality: "Malaysian",
        religion: "Islam",
        address: "NO. 123, JALAN BUKIT BINTANG, 50200 KUALA LUMPUR"
      }
    }
         │
         ▼
Auto-Fill Form
    firstName: "AHMAD"
    lastName: "BIN ABDULLAH"
    icNumber: "950815145678"
    gender: "M"
    dateOfBirth: "1995-08-15"
    [All marked as auto-filled ✓]
         │
         ▼
User Completes & Submits
         │
         ▼
Registration Complete!
```

## Component Interaction

```
┌────────────────────────────────────────────────────────────────┐
│                    COMPONENT DIAGRAM                            │
└────────────────────────────────────────────────────────────────┘

Frontend:
    Register.js
        ├─► handleFrontImageUpload()
        ├─► handleBackImageUpload()
        ├─► processFrontIC()
        ├─► processBackIC()
        ├─► extractDataFromText()
        ├─► extractBackData()
        ├─► verifyCompleteIC()
        └─► handleSubmit()

Backend:
    authRoutes.js
        ├─► POST /verify-ic
        ├─► POST /verify-ic-database
        ├─► POST /upload-ic
        └─► POST /verify-ic-complete
                │
                ▼
    authController.js
        ├─► verifyIC()
        ├─► verifyICDatabase()
        ├─► uploadIC()
        └─► verifyICComplete()
                │
                ▼
    icVerification.js (Service)
        ├─► verifyICWithDatabase()
        ├─► verifyICFrontAndBack()
        ├─► checkICRegistered()
        ├─► validateSecurityFeatures()
        └─► calculateAddressSimilarity()
                │
                ▼
    icOCR.js (Utility)
        ├─► preprocessICImage()
        ├─► extractICFromText()
        ├─► extractICBackFromText()
        ├─► validateICImage()
        └─► detectSecurityFeatures()

Data:
    mockICDatabase.json
        ├─► validICs[]
        ├─► blacklistedICs[]
        └─► revokedICs[]

    User Model (MongoDB)
        └─► Check for duplicate ICs
```

This architecture ensures:
- ✅ Separation of concerns
- ✅ Scalability
- ✅ Easy testing
- ✅ Maintainability
- ✅ Clear data flow
- ✅ Error handling at each step
