# Quick Test Guide - IC Verification System

## Quick Start (5 Minutes)

### Step 1: Start the Application
```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

### Step 2: Navigate to Registration
Open http://localhost:3000 and click "Create your account"

### Step 3: Test Basic IC Entry

**Easy Test - Just Type IC Number:**
1. Scroll to "Malaysian IC Number" field
2. Enter: `950815145678`
3. Watch it auto-verify (should show green checkmark)
4. Notice how Gender and Date of Birth auto-fill

### Step 4: Test Full Verification (With Images)

**Method A: Create Simple Test Images**

1. Create a text file with the following content:
```
AHMAD BIN ABDULLAH
950815145678
```
2. Take a screenshot of it - this is your "Front IC"

3. Create another text file:
```
950815145678
ALAMAT
NO. 123, JALAN BUKIT BINTANG
50200 KUALA LUMPUR
```
4. Take a screenshot - this is your "Back IC"

**Upload & Verify:**
1. Click "Upload front IC" and select first screenshot
2. Click "Scan Front IC" - wait for extraction
3. Click "Upload back IC" and select second screenshot  
4. Click "Scan Back IC" - wait for extraction
5. Click "Verify IC with Government Database"
6. Should show: ✓ "IC fully verified with government database!"

### Step 5: Test Different Scenarios

**Valid IC (Success):**
- IC: `950815145678` → Should verify successfully

**Blacklisted IC (Failure):**
- IC: `901010142345` → Should show "Reported stolen"

**Under 18 (Failure):**
- IC: `101225145678` (Born 2010) → Should show "Must be 18+"

**Not in Database:**
- IC: `999999999999` → Should show "IC not found in database"

## Testing Without Images (Fastest)

Just enter the IC number manually and the system will:
1. Validate format ✓
2. Check age requirement ✓
3. Extract gender and DOB ✓
4. Auto-fill form fields ✓

Then click "Verify IC with Government Database" to:
5. Check if IC exists in database ✓
6. Check if blacklisted/revoked ✓
7. Verify full details ✓

## Valid Test IC Numbers

Copy any of these for quick testing:

```
950815145678  - Ahmad (Male, 1995)
880422083456  - Siti (Female, 1988)
920305141234  - Rajesh (Male, 1992)
850712076789  - Lee (Female, 1985)
001225144567  - Chen (Male, 2000)
```

## Expected Behavior

### ✅ Success Flow
1. Enter IC number → Green checkmark
2. Gender/DOB auto-fills → Shows "(Auto-filled from IC)"
3. Upload both IC images (optional) → Shows "✓ Scanned"
4. Click verify → "IC fully verified with government database!"
5. Complete registration → Success!

### ❌ Failure Scenarios
- **Blacklisted**: "IC has been reported and cannot be used"
- **Revoked**: "IC has been revoked and is no longer valid"
- **Not Found**: "IC number not found in government database"
- **Under 18**: "Must be at least 18 years old to register"
- **Wrong Format**: "IC number must be 12 digits"

## Troubleshooting

**Q: IC number not verifying?**
- Make sure it's exactly 12 digits
- Use one from the valid test list above
- Check you're not using a blacklisted number

**Q: OCR not extracting data?**
- Make sure screenshot is clear
- IC number should be visible
- Try the simple text file screenshot method above

**Q: "IC already registered" error?**
- That IC was used before
- Clear the database or use a different IC number

**Q: Form not submitting?**
- Fill ALL required fields
- Password must be 6+ characters
- IC must show green checkmark
- Email must be valid format

## Demo Video Flow

1. Open registration page
2. Type IC: `950815145678`
3. Watch auto-fill happen
4. Fill email and password
5. Click "Register"
6. Success!

**That's it!** 🎉

For advanced testing with images and complete verification, see [IC_VERIFICATION_GUIDE.md](./IC_VERIFICATION_GUIDE.md)
