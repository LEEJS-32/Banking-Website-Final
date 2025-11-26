# IC Photo Scanning Feature - User Guide

## 🎯 Overview
The registration system now supports **automatic IC scanning** from photos! Simply upload a photo of your Malaysian IC (MyKad) card, and the system will automatically extract and verify your information.

## ✨ Features
- 📸 **Photo Upload**: Upload IC photo from camera or gallery
- 🔍 **OCR Technology**: Automatically scan and extract IC number
- ✅ **Auto-Verification**: Validate extracted IC instantly
- 📝 **Auto-Fill**: Automatically fill gender and date of birth
- 👁️ **Preview**: See your uploaded image before processing
- 📊 **Progress Bar**: Real-time scanning progress indicator
- ❌ **Easy Reset**: Clear and re-upload if needed

## 🚀 How to Use

### Step 1: Upload IC Photo
1. Navigate to the registration page
2. Look for the **"Upload Malaysian IC (MyKad) Photo"** section
3. Click the upload area or drag and drop your IC photo
4. Supported formats: JPG, PNG, GIF (max 5MB)

### Step 2: Scan the Image
1. After upload, you'll see a preview of your IC image
2. Click the **"🔍 Scan & Extract IC Info"** button
3. Wait for the progress bar to complete (usually 5-15 seconds)
4. The system will automatically extract the IC number

### Step 3: Automatic Verification
1. Once extracted, the IC number is automatically verified
2. If valid:
   - ✅ Green checkmark appears
   - Gender field auto-filled
   - Date of Birth auto-filled
3. If invalid:
   - ❌ Error message shown
   - You can enter IC manually instead

### Step 4: Complete Registration
1. Fill in remaining fields (name, email, password)
2. Review auto-filled information
3. Click "Create account" to register

## 📸 Tips for Best Results

### Taking IC Photos
✅ **DO:**
- Use good lighting (natural daylight is best)
- Place IC on flat, contrasting background (dark IC on light surface)
- Keep camera steady and focused
- Capture the entire IC card within frame
- Ensure IC number is clearly visible
- Take photo straight-on (not at angle)
- Use high resolution camera if available

❌ **DON'T:**
- Take photos in dim lighting
- Use flash (can create glare)
- Tilt or rotate the IC
- Cover any part of the IC number
- Use blurry or out-of-focus images
- Include fingers covering IC details
- Use heavily worn or damaged IC cards

### Image Quality Guidelines
| Aspect | Requirement |
|--------|-------------|
| **Resolution** | Minimum 800x500 pixels |
| **File Size** | Maximum 5MB |
| **Format** | JPG, PNG, GIF |
| **Brightness** | Well-lit, not too dark |
| **Focus** | Sharp text, no blur |
| **Angle** | Straight-on, no tilt |

## 🔧 Troubleshooting

### Issue: IC Number Not Detected
**Possible Causes:**
- Poor image quality
- Glare or shadows
- IC number obscured
- Worn or damaged IC

**Solutions:**
1. Retake photo with better lighting
2. Clean IC card surface
3. Ensure no fingers covering details
4. Try different background color
5. Enter IC manually if scanning fails

### Issue: Wrong IC Number Extracted
**Possible Causes:**
- OCR misread similar characters
- Multiple numbers in image
- Poor image contrast

**Solutions:**
1. Check the extracted number
2. Manually correct if needed
3. Retake photo with better quality
4. Use manual entry mode

### Issue: "Image Too Large" Error
**Solution:**
1. Reduce image size before upload
2. Use phone camera instead of high-end DSLR
3. Compress image using online tools

### Issue: Processing Takes Too Long
**Causes:**
- Large image file
- Slow device/browser
- Complex background

**Solutions:**
1. Use smaller image
2. Close other browser tabs
3. Refresh and try again
4. Use manual entry as alternative

## 🎨 UI Elements

### Upload Area (Before Upload)
```
┌─────────────────────────────────────┐
│  📸 Upload Malaysian IC (MyKad)     │
│                                      │
│  ┌───────────────────────────────┐  │
│  │         [Camera Icon]         │  │
│  │   Click to upload IC photo    │  │
│  │   PNG, JPG, GIF up to 5MB    │  │
│  └───────────────────────────────┘  │
│                                      │
│  Upload a clear photo of IC front   │
└─────────────────────────────────────┘
```

### Preview Area (After Upload)
```
┌─────────────────────────────────────┐
│  📸 Upload Malaysian IC (MyKad)     │
│                                      │
│  ┌───────────────────────────────┐  │
│  │    [IC Image Preview]    [X]  │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌───────────────────────────────┐  │
│  │  🔍 Scan & Extract IC Info   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Processing State
```
┌─────────────────────────────────────┐
│  Processing image...           75%  │
│  ████████████████░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────┘
```

### Success State
```
┌─────────────────────────────────────┐
│  Malaysian IC Number (MyKad)        │
│  ┌───────────────────────────────┐  │
│  │  950815145678                 │  │
│  └───────────────────────────────┘  │
│  ✓ IC extracted and verified       │
└─────────────────────────────────────┘
```

## 🧪 Testing

### Test Scenario 1: Perfect Conditions
1. Use clear, well-lit IC photo
2. Upload to registration form
3. Click "Scan & Extract IC Info"
4. **Expected:** IC number extracted correctly, auto-filled fields

### Test Scenario 2: Manual Override
1. Upload IC photo
2. Scan extracts incorrect number
3. Manually edit IC number field
4. **Expected:** Can override extracted value, validation still works

### Test Scenario 3: No Photo Method
1. Skip photo upload section
2. Directly enter IC number manually
3. Submit form
4. **Expected:** Works same as before, photo optional

### Test Scenario 4: Clear and Retry
1. Upload IC photo
2. Click X button to clear
3. Upload different photo
4. **Expected:** Previous data cleared, new scan works

### Sample Test Data

#### Valid IC for Testing
If you need to test without real IC photos, you can skip the photo upload and manually enter:
- `001225081235` → Male, born 25 Dec 2000
- `950815145678` → Female, born 15 Aug 1995
- `880306035678` → Female, born 06 Mar 1988

## 🔒 Security & Privacy

### Data Handling
- ✅ Images processed client-side (Tesseract.js in browser)
- ✅ Images NOT stored on server
- ✅ Only IC number sent to server for validation
- ✅ IC number encrypted in database
- ✅ HTTPS required for production

### Privacy Notes
- Photo stays on your device
- OCR runs in your browser
- No image uploaded to cloud
- Server only validates IC number
- Data used only for account verification

## 🛠️ Technical Details

### OCR Technology
- **Engine:** Tesseract.js v4
- **Language:** English (numbers and text)
- **Processing:** Client-side JavaScript
- **Average Time:** 5-15 seconds
- **Accuracy:** ~95% with good images

### Extraction Pattern
The system looks for:
1. 12 consecutive digits (e.g., `950815145678`)
2. Formatted IC (e.g., `950815-14-5678`)
3. IC with labels (e.g., `No. K/P: 950815145678`)

### Image Processing Pipeline
```
Upload → Preview → Tesseract OCR → Pattern Match → IC Extract → Validate → Auto-Fill
```

### Supported IC Formats in Image
- `950815145678` (no dashes)
- `950815-14-5678` (with dashes)
- `No. KP: 950815145678` (with label)
- `K/P 950815-14-5678` (with label)

## 📱 Mobile Support

### Mobile Camera
- ✅ Direct camera access on mobile devices
- ✅ "Take Photo" option appears
- ✅ Gallery selection available
- ✅ Responsive UI for small screens

### Mobile Best Practices
1. Use rear camera for better quality
2. Enable flash if in low light
3. Use landscape mode
4. Tap to focus on IC number
5. Hold phone steady

## 🚧 Limitations

### Current Limitations
- Only front side of IC supported
- English/numeric text recognition only
- Requires clear, focused images
- Cannot verify IC authenticity (only format)
- No hologram or chip verification
- Not suitable for heavily damaged ICs

### Future Enhancements
- [ ] Back side scanning
- [ ] Multi-language OCR
- [ ] Live camera preview with guides
- [ ] Image quality checker before scan
- [ ] IC authenticity verification
- [ ] Liveness detection
- [ ] Government IC database integration

## 📊 Performance

### Expected Performance
- **Upload Speed:** < 1 second (depends on file size)
- **OCR Processing:** 5-15 seconds (depends on image size/device)
- **Validation:** < 1 second
- **Total Time:** ~10-20 seconds from upload to verified

### Browser Compatibility
| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| Mobile Safari | ✅ Full |
| Chrome Mobile | ✅ Full |

## 🎓 Example Workflow

```
User Journey:
1. Open Registration → 2. Upload IC Photo → 3. Preview Image → 
4. Click "Scan" → 5. Wait (progress bar) → 6. IC Extracted → 
7. Auto-Verified → 8. Form Auto-Filled → 9. Complete Registration
```

## 💡 Pro Tips

1. **Best Lighting:** Natural daylight or bright white light
2. **Background:** Use plain white/black surface
3. **Distance:** 15-20cm from IC to camera
4. **Angle:** Straight perpendicular view
5. **Stability:** Rest IC and phone on flat surface
6. **Backup:** Can always enter manually if scanning fails

## 🆘 Support

### Common Questions

**Q: Is photo upload required?**
A: No, it's optional. You can manually enter IC number.

**Q: Where is my photo stored?**
A: Nowhere! OCR runs in your browser, image never leaves your device.

**Q: How accurate is the scanning?**
A: ~95% with clear images. Always verify extracted number.

**Q: Can I edit extracted IC number?**
A: Yes, the field is editable after extraction.

**Q: What if scanning fails?**
A: Simply enter IC manually in the text field below.

---

## 🎉 Ready to Try?

Start your registration with IC photo scanning now! The system makes it easy to verify your identity in seconds.
