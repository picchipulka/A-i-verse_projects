# Quick Start Guide - Google Sign-In Authentication

## 🚀 What You Got

✅ **login.html** - Beautiful login page with Google Sign-In  
✅ **auth-helper.js** - Reusable authentication functions for all pages  
✅ **example-protected-page.html** - Example showing how to use auth  
✅ **SETUP_GUIDE.md** - Complete step-by-step setup instructions  

---

## ⚡ Quick Setup (5 Steps)

### 1. Firebase Console Setup
```
1. Go to: https://console.firebase.google.com/
2. Select project OR create new one
3. Enable Authentication → Google Sign-in
4. Enable Firestore Database
5. Copy your Firebase config
```

### 2. Update Config in Files
Replace in `login.html` and `auth-helper.js`:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... rest of your config
};
```

### 3. Add Authorized Domain
```
Firebase Console → Authentication → Settings
Add: noobworks-ai.in
```

### 4. Upload to Hostinger
```
Upload these files to your website root:
- login.html
- auth-helper.js
- (optional) example-protected-page.html
```

### 5. Test It!
```
Visit: https://noobworks-ai.in/login.html
Click: "Continue with Google"
Should work! ✨
```

---

## 📝 How to Use in Your Pages

### Add Login Button to Navigation
```html
<div id="user-nav"></div>

<script type="module">
    import { checkAuth, updateNavigation } from './auth-helper.js';
    
    checkAuth().then(() => updateNavigation());
</script>
```

### Protect a Page (Requires Login)
```html
<script type="module">
    import { checkAuth } from './auth-helper.js';
    
    // Redirect to login if not authenticated
    await checkAuth(true);
</script>
```

### Show User's Name
```html
<h1 id="greeting">Welcome!</h1>

<script type="module">
    import { showGreeting } from './auth-helper.js';
    
    showGreeting('greeting'); // Shows "Welcome back, Harsha!"
</script>
```

### Protect Premium Content
```html
<div id="premium"></div>

<script type="module">
    import { requireAuth } from './auth-helper.js';
    
    const hasAccess = await requireAuth('premium');
    if (hasAccess) {
        // Show premium content
    }
</script>
```

---

## 🎯 Integration with Your Site

### Homepage
- Add navigation with login/logout button
- Show public content to everyone
- Show login prompt for premium features

### Automation Page
- Add auth check at top
- Show "Sign in to access" message if not logged in
- Load Arrear Alarm if authenticated

### Arrear Alarm
**Option 1**: Redirect to login
```javascript
await checkAuth(true); // Redirects if not logged in
```

**Option 2**: Embed in protected page
```html
<iframe src="https://arrear-alarm.web.app"></iframe>
```

---

## 🛠️ Files You Need to Edit

| File | What to Change |
|------|----------------|
| `login.html` | Firebase config (line ~100) |
| `auth-helper.js` | Firebase config (line ~10) |
| Your homepage | Add navigation snippet |
| Your automation page | Add auth check |

---

## ✅ Testing Checklist

- [ ] Firebase project created/selected
- [ ] Google Sign-in enabled
- [ ] Firestore database enabled
- [ ] Firebase config updated in files
- [ ] Domain added to authorized domains
- [ ] Files uploaded to Hostinger
- [ ] Login page works: `/login.html`
- [ ] Can sign in with Google
- [ ] Navigation shows user name
- [ ] Logout works
- [ ] Protected pages redirect to login

---

## 🆘 Quick Fixes

**Can't sign in?**
→ Check authorized domains in Firebase Console

**User name not showing?**
→ Check browser console for errors (F12)

**Redirect not working?**
→ Verify file paths are correct

**Firestore error?**
→ Check security rules in Firebase

---

## 📱 Mobile Responsive

All files are mobile-friendly and will work on:
- Desktop browsers
- Mobile browsers (iOS Safari, Android Chrome)
- Tablets

---

## 🎨 Customization

### Change Colors
Edit `login.html` CSS:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change to your brand colors */
```

### Change Redirect After Login
In `login.html`:
```javascript
window.location.href = '/dashboard.html'; // Your page
```

### Add Profile Picture
In `auth-helper.js` `updateNavigation()`:
```javascript
<img src="${currentUserProfile.photoURL}" />
```

---

## 📚 Full Documentation

For complete details, see **SETUP_GUIDE.md**

---

## 🎉 You're Ready!

1. Follow Quick Setup steps above
2. Test on your site
3. Integrate into your pages
4. Customize as needed

Questions? Check SETUP_GUIDE.md for detailed explanations!
