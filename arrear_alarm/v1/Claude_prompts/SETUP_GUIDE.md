# Firebase Authentication Setup Guide

## Overview
This guide will help you set up Google Sign-In authentication for your NoobWorks AI website.

---

## Part 1: Firebase Project Setup

### Step 1: Create/Configure Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/

2. **Option A - Use Existing Project** (Recommended if you have arrear-alarm project):
   - Select your existing `arrear-alarm` project
   - OR

3. **Option B - Create New Project**:
   - Click "Add Project"
   - Name it: `noobworks-ai` or similar
   - Enable Google Analytics (optional)
   - Click "Create Project"

### Step 2: Enable Google Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **"Get Started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Google"**
5. Toggle **"Enable"**
6. Add your support email
7. Click **"Save"**

### Step 3: Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules later)
4. Select your region (choose closest to your users)
5. Click **"Enable"**

### Step 4: Set Up Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Add other collections as needed
  }
}
```

3. Click **"Publish"**

### Step 5: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **web icon** `</>`
4. Register your app:
   - App nickname: `noobworks-ai-web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click **"Register app"**
5. **Copy the Firebase configuration object**

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 6: Add Authorized Domains

1. Go to **Authentication** → **Settings** tab
2. Scroll to **"Authorized domains"**
3. Add your domains:
   - `noobworks-ai.in`
   - `localhost` (for testing)
4. Click **"Add domain"** for each

---

## Part 2: Update Your Website Files

### Step 1: Update Firebase Config in Your Files

Replace the placeholder config in these files:
- `login.html` (line ~100)
- `auth-helper.js` (line ~10)

Replace this:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

With your actual config from Step 5 above.

### Step 2: Upload Files to Your Website

Upload these files to your Hostinger hosting:

```
your-website/
├── login.html              ← Login page
├── auth-helper.js          ← Authentication helper (used on all pages)
├── example-protected-page.html  ← Example of protected content
└── (your other pages)
```

---

## Part 3: Integrate Authentication into Existing Pages

### For Pages That Don't Require Login

Add this to your existing pages (like homepage):

```html
<!-- Add this in the <head> section -->
<div id="user-nav"></div>

<!-- Add this before closing </body> tag -->
<script type="module">
    import { checkAuth, updateNavigation } from './auth-helper.js';
    
    async function init() {
        await checkAuth(false); // false = don't redirect
        updateNavigation();
    }
    
    init();
</script>
```

### For Pages That Require Login

Add this to pages that need authentication (like Arrear Alarm):

```html
<!-- Add this before closing </body> tag -->
<script type="module">
    import { checkAuth } from './auth-helper.js';
    
    async function init() {
        const user = await checkAuth(true); // true = redirect to login if not authenticated
        
        if (user) {
            // User is logged in - show the page
            console.log('User:', user.name);
        }
    }
    
    init();
</script>
```

### For Pages with Premium Content Sections

Use the `requireAuth()` function:

```html
<div id="premium-content">
    <p>Loading...</p>
</div>

<script type="module">
    import { requireAuth } from './auth-helper.js';
    
    async function init() {
        const hasAccess = await requireAuth('premium-content');
        
        if (hasAccess) {
            // User is logged in - show premium content
            document.getElementById('premium-content').innerHTML = `
                <h2>Premium Content Here</h2>
                <p>Your exclusive content...</p>
            `;
        }
    }
    
    init();
</script>
```

---

## Part 4: Update Arrear Alarm App

To protect Arrear Alarm with authentication:

### Option 1: Redirect to Login

Add this at the beginning of your Arrear Alarm `index.html`:

```html
<script type="module">
    import { checkAuth, getUserFirstName } from './auth-helper.js';
    
    // Check authentication before loading the app
    const user = await checkAuth(true); // Redirect to login if not authenticated
    
    if (user) {
        // Update welcome message with user's name
        document.getElementById('welcome-message').textContent = 
            `Welcome, ${getUserFirstName()}!`;
    }
</script>
```

### Option 2: Embed in Protected Page

Create a new page `arrear-alarm-protected.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Arrear Alarm - NoobWorks AI</title>
</head>
<body>
    <div id="app-container"></div>
    
    <script type="module">
        import { requireAuth, getUserFirstName } from './auth-helper.js';
        
        const hasAccess = await requireAuth('app-container');
        
        if (hasAccess) {
            // Load the Arrear Alarm app
            document.getElementById('app-container').innerHTML = `
                <iframe 
                    src="https://arrear-alarm.web.app" 
                    style="width: 100%; height: 100vh; border: none;"
                ></iframe>
            `;
        }
    </script>
</body>
</html>
```

---

## Part 5: Testing

### Local Testing

1. **Start a local server** (required for Firebase Auth):
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

2. **Open in browser**: http://localhost:8000/login.html

3. **Test the flow**:
   - Click "Continue with Google"
   - Sign in with your Google account
   - Should redirect to homepage
   - Check if navigation shows "Hi, [Your Name]!"

### Production Testing

1. Upload all files to your Hostinger hosting
2. Visit: https://noobworks-ai.in/login.html
3. Test Google Sign-In
4. Verify navigation updates correctly
5. Test protected pages

---

## Part 6: Customization

### Change Redirect After Login

In `login.html`, change this line:
```javascript
window.location.href = '/index.html';  // Change to your desired page
```

### Customize User Greeting

In `auth-helper.js`, modify the `updateNavigation()` function to match your design.

### Add User Profile Picture

Update navigation to show profile picture:
```javascript
navContainer.innerHTML = `
    <div class="user-menu">
        <img src="${currentUserProfile.photoURL}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%;">
        <span class="user-greeting">Hi, ${getUserFirstName()}!</span>
        <button id="logout-btn" class="logout-btn">Logout</button>
    </div>
`;
```

---

## Troubleshooting

### Error: "auth/unauthorized-domain"
**Solution**: Add your domain to Authorized Domains in Firebase Console (Part 1, Step 6)

### Error: "Firebase not defined"
**Solution**: Check that Firebase SDK scripts are loading correctly. Verify internet connection.

### User data not saving
**Solution**: Check Firestore security rules. Make sure they allow authenticated users to write to their documents.

### Logout not working
**Solution**: Check that `auth-helper.js` is properly imported and the logout button event listener is attached.

---

## Next Steps

1. **Complete Firebase setup** (Part 1)
2. **Update configuration** in your files (Part 2)
3. **Upload to Hostinger** (Part 2)
4. **Test locally** first (Part 5)
5. **Deploy to production** (Part 5)
6. **Customize as needed** (Part 6)

---

## Security Best Practices

1. ✅ Never commit Firebase config with API keys to public repositories
2. ✅ Use Firestore security rules to protect user data
3. ✅ Validate user data on the backend (if you add one later)
4. ✅ Use HTTPS for all pages (Hostinger provides this)
5. ✅ Regularly review authorized domains

---

## Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify Firebase configuration is correct
3. Check Firestore security rules
4. Ensure domains are authorized
5. Test with different browsers

---

Good luck! 🚀
