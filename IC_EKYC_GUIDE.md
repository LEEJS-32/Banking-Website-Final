# Malaysian IC eKYC Feature Guide

## Overview
The registration system now includes Malaysian IC (MyKad) verification for identity validation. The IC number is validated in real-time and automatically extracts personal information.

## Features
- ✅ Real-time IC format validation
- ✅ Age verification (18+ required)
- ✅ Duplicate IC detection
- ✅ Auto-fill gender from IC
- ✅ Auto-fill date of birth from IC
- ✅ Birth place extraction from IC
- ✅ Visual feedback for validation status

## IC Format
Malaysian IC (MyKad) format: **YYMMDD-PB-###G**
- **YYMMDD**: Date of birth (Year, Month, Day)
- **PB**: Birth place code (2 digits)
- **###G**: Sequence number and gender digit

### Example Valid IC Numbers
```
950815145678  → Born: 15 Aug 1995, State: Johor, Gender: Female (8 is even)
001225081234  → Born: 25 Dec 2000, State: Pahang, Gender: Male (4 is odd → error, should be 3 or 5)
001225081235  → Born: 25 Dec 2000, State: Pahang, Gender: Male (5 is odd) ✓
880306035678  → Born: 06 Mar 1988, State: Kelantan, Gender: Female (8 is even)
750920121345  → Born: 20 Sep 1975, State: Kuala Lumpur, Gender: Male (5 is odd)
```

### Gender Determination
- **Last digit ODD (1, 3, 5, 7, 9)**: Male
- **Last digit EVEN (0, 2, 4, 6, 8)**: Female

### Birth Place Codes (Sample)
| Code | State/Region |
|------|--------------|
| 01-21, 22-24 | Johor |
| 25-26 | Melaka |
| 27-28 | Negeri Sembilan |
| 29-30 | Pahang |
| 31-59 | Selangor |
| 50-51 | Wilayah Persekutuan KL |
| 52-53 | Wilayah Persekutuan Labuan |
| 60-61 | Sabah |
| Full list in backend/utils/icValidator.js |

## How to Use

### 1. Registration Form
1. Navigate to the registration page
2. Fill in First Name, Last Name, Email
3. Enter 12-digit Malaysian IC number (without dashes)
   - Example: `950815145678`
4. System will automatically:
   - Validate the IC format
   - Check if IC already registered
   - Extract and fill Date of Birth
   - Extract and fill Gender
   - Show verification status

### 2. Validation States
- **Validating**: Blue text "Verifying IC..."
- **Valid**: Green border, "✓ IC verified successfully"
  - Gender and DOB fields auto-filled and disabled
- **Invalid**: Red border, error message
  - "Invalid IC number format or age requirement not met"
  - "This IC number is already registered"

### 3. Age Requirement
- Must be 18 years or older
- Calculated from IC birth date

## Testing Guide

### Test Case 1: Valid IC (Young Adult)
```
IC: 001225081235
Expected:
- Gender: Male (last digit 5 is odd)
- DOB: 2000-12-25
- Age: 24 years
- Birth Place: Pahang
- Status: ✓ Verified
```

### Test Case 2: Valid IC (Middle-aged)
```
IC: 880306035678
Expected:
- Gender: Female (last digit 8 is even)
- DOB: 1988-03-06
- Age: 36 years
- Birth Place: Kelantan
- Status: ✓ Verified
```

### Test Case 3: Invalid IC (Under 18)
```
IC: 101225081235
Expected:
- Error: "Invalid IC number format or age requirement not met"
- Reason: Born 2010, age 14 (under 18)
```

### Test Case 4: Invalid IC (Bad Format)
```
IC: 123456
Expected:
- No validation triggered (less than 12 digits)
```

### Test Case 5: Duplicate IC
```
1. Register with IC: 950815145678
2. Try registering again with same IC
Expected:
- Error: "This IC number is already registered"
```

## API Endpoints

### Verify IC
```http
POST /api/auth/verify-ic
Content-Type: application/json

{
  "icNumber": "950815145678"
}
```

**Success Response:**
```json
{
  "valid": true,
  "message": "IC verified successfully",
  "data": {
    "icNumber": "950815145678",
    "formattedIC": "950815-14-5678",
    "dateOfBirth": "1995-08-15",
    "age": 29,
    "gender": "F",
    "birthPlace": "Johor"
  }
}
```

**Error Response:**
```json
{
  "message": "Invalid IC number format or age requirement not met",
  "valid": false
}
```

### Register with IC
```http
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "icNumber": "950815145678",
  "gender": "F",
  "dateOfBirth": "1995-08-15",
  "accountType": "checking",
  "bank": "HSBC",
  "country": "Malaysia"
}
```

## Database Schema

### User Model IC Fields
```javascript
{
  icNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  icVerified: {
    type: Boolean,
    default: false
  },
  icVerifiedAt: Date,
  birthPlace: String,
  gender: String,
  dateOfBirth: Date
}
```

## Implementation Details

### Backend Components
1. **backend/utils/icValidator.js**: IC validation logic
   - Format validation
   - Age calculation
   - Gender extraction
   - Birth place mapping

2. **backend/controllers/authController.js**:
   - `verifyIC`: Real-time validation endpoint
   - `register`: Updated with IC validation

3. **backend/routes/authRoutes.js**:
   - POST `/api/auth/verify-ic`: Verification endpoint

### Frontend Components
1. **frontend/src/pages/Register.js**:
   - IC input field with real-time validation
   - Auto-fill gender and DOB when IC verified
   - Visual feedback (colors, messages)
   - Validation state management

## Troubleshooting

### Issue: IC not verifying
- **Check**: Backend server running on port 5000
- **Check**: IC format is 12 digits, no spaces/dashes
- **Check**: Age is 18 or above

### Issue: Auto-fill not working
- **Check**: IC validation shows green "✓ IC verified successfully"
- **Check**: Browser console for errors
- **Check**: Network tab shows successful POST to /api/auth/verify-ic

### Issue: "IC already registered" for new IC
- **Clear**: Database User collection
- **Or**: Use different IC number for testing

## Security Notes
- IC numbers stored as plain text (consider encryption for production)
- Sparse unique index allows null IC (optional field)
- IC verified status tracked with timestamp
- Duplicate prevention at database level

## Future Enhancements
- [ ] OCR integration for IC scanning
- [ ] Face recognition matching
- [ ] Liveness detection
- [ ] Document authenticity verification
- [ ] Integration with MyKad chip reading
- [ ] Encrypt IC numbers at rest
