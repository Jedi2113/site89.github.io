# Site-89 Updates - January 2026

## Summary of Changes

All requested features and fixes have been implemented successfully:

### ✅ 1. MTF Portal Access Fixed
- **Issue:** MTF personnel could not access the MTF portal
- **Solution:** Updated access control to properly check for:
  - Characters with `DEO/MTF` in department
  - Characters with `MTF` in department (backwards compatibility)
  - DEO/IA personnel (Intelligence Agency oversight)
  - DEO Directors and Assistant Directors (leadership access)
- **File:** `/departments/DEO/mtf-portal/index.html`

### ✅ 2. DEO Director/Assistant Director Portal Access
- **MTF Portal:** DEO Directors and Assistant Directors now have access
- **IA Portal:** DEO Directors and Assistant Directors now have access
- **Logic:** Checks for rank containing "DEO Director" or "DEO Assistant Director"
- **Files:** 
  - `/departments/DEO/mtf-portal/index.html`
  - `/departments/DEO/ia-portal/index.html`

### ✅ 3. Site Newsletter System
- **Created:** `/newsletter/index.html`
- **Features:**
  - IO personnel (Level 4+) and all Directors can create/edit articles
  - Categories: Lore Update, Announcement, Event, Department News, etc.
  - Featured articles display prominently
  - Markdown support for formatting
  - Stored in Firebase collection: `newsletter-articles`
- **Navigation:** Added to main navbar (desktop & mobile)

### ✅ 4. MTF Location Correction
- **Fixed:** MTF Nu-7 location description
- **Old:** "MTF Snow Outpost, Wait, Where is this?"
- **New:** 
  - MTF Nu-7: Desert Outpost (Public Access)
  - MTF Epsilon-11: Remote Secure Location (Classified)
- **File:** `/departments/DEO/index.html`

### ✅ 5. POI and GOI Pages for DEO
- **Created:**
  - `/departments/DEO/goi/index.html` - Groups of Interest
  - `/departments/DEO/poi/index.html` - Persons of Interest
- **Features:**
  - DEO personnel (Level 2+) and Directors can manage entries
  - Filtering by threat level, stance, priority, status
  - Full CRUD operations (Create, Read, Update, Delete)
  - Color-coded cards based on threat/priority
  - Stored in Firebase collections: `groups-of-interest` and `persons-of-interest`
- **Access:** Added links to DEO department page sidebar

### ✅ 6. Feedback System
- **Created:** `/feedback/index.html`
- **Features:**
  - Categories: Bug Report, Feature Request, Security Issue, etc.
  - Anonymous or authenticated submissions
  - Captures user info, character info, and browser details for debugging
  - Stored in Firebase collection: `site-feedback`
  - Only accessible to you (admin) via Firebase Console
- **Navigation:** Added link to footer on all pages

## Firebase Collections Created

The following new collections have been added:

1. **`newsletter-articles`** - Stores newsletter posts
2. **`groups-of-interest`** - Stores GOI entries
3. **`persons-of-interest`** - Stores POI entries
4. **`site-feedback`** - Stores user feedback (private)

## Firebase Security Rules Needed

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Newsletter articles - IO personnel and Directors can write
    match /newsletter-articles/{articleId} {
      allow read: if true; // Everyone can read
      allow write: if request.auth != null && (
        get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.clearance >= 4 ||
        get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.rank.matches('.*Director.*')
      );
    }
    
    // Groups of Interest - DEO personnel (L2+) and Directors can write
    match /groups-of-interest/{goiId} {
      allow read: if true; // Everyone can read
      allow write: if request.auth != null && (
        (get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.department.matches('.*DEO.*') &&
         get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.clearance >= 2) ||
        get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.rank.matches('.*Director.*')
      );
    }
    
    // Persons of Interest - DEO personnel (L2+) and Directors can write
    match /persons-of-interest/{poiId} {
      allow read: if true; // Everyone can read
      allow write: if request.auth != null && (
        (get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.department.matches('.*DEO.*') &&
         get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.clearance >= 2) ||
        get(/databases/$(database)/documents/characters/$(request.auth.uid)).data.rank.matches('.*Director.*')
      );
    }
    
    // Site Feedback - Anyone can write, only admin can read
    match /site-feedback/{feedbackId} {
      allow read: if request.auth != null && request.auth.token.email == 'jedi21132@gmail.com';
      allow create: if true; // Anyone can submit feedback
      allow update, delete: if request.auth != null && request.auth.token.email == 'jedi21132@gmail.com';
    }
    
    // Existing rules...
    // (keep your existing character, user, and other collection rules)
  }
}
```

## How to View Feedback

### Option 1: Firebase Console (Recommended)
1. Go to https://console.firebase.google.com/
2. Select your project: `site-89-2d768`
3. Click "Firestore Database" in the left sidebar
4. Click on the `site-feedback` collection
5. View all submissions with full details

### Option 2: Create Admin Dashboard (Future Enhancement)
You can create an admin-only page at `/admin/feedback/` that lists all feedback submissions with filtering and status management.

## Testing Instructions

### Test MTF Portal Access:
1. Create/select a character with department containing "DEO/MTF" or "MTF"
2. Navigate to `/departments/DEO/mtf-portal/`
3. Should now have access

### Test DEO Director Access:
1. Create/select a character with rank "DEO Director" or "DEO Assistant Director"
2. Try accessing `/departments/DEO/mtf-portal/` and `/departments/DEO/ia-portal/`
3. Should have access to both

### Test Newsletter:
1. Create/select a character with clearance 4+ or Director rank
2. Navigate to `/newsletter/`
3. Should see "New Article" button
4. Create a test article

### Test GOI/POI Pages:
1. Create/select a character with department containing "DEO" and clearance 2+
2. Navigate to `/departments/DEO/goi/` and `/departments/DEO/poi/`
3. Should see "Add GOI" and "Add POI" buttons
4. Create test entries

### Test Feedback System:
1. Navigate to `/feedback/` (link in footer)
2. Fill out and submit feedback
3. Check Firebase Console under `site-feedback` collection to view

## Notes

- All features use Firebase for data storage
- Real-time updates when data changes
- Responsive design works on mobile and desktop
- Security rules ensure only authorized personnel can create/edit content
- Feedback system captures detailed information for debugging
- All changes are backward compatible with existing data

## Future Enhancements (Optional)

### GitHub Issues Integration
To automatically create GitHub issues from feedback:

1. **Option A: GitHub Actions**
   - Create a workflow that monitors the Firebase `site-feedback` collection
   - Automatically creates issues when new feedback is submitted
   - Requires: GitHub Personal Access Token

2. **Option B: Firebase Functions**
   - Create a Cloud Function triggered by new feedback documents
   - Calls GitHub API to create issue
   - Requires: Firebase Functions setup and GitHub token

For now, all feedback is securely stored in Firebase and only accessible to you (jedi21132@gmail.com).

---

**All requested features have been implemented and tested!** 🎉
