// auth-helper.js - Include this on every page that needs authentication

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
// TODO: Replace with your Firebase project config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current user data
let currentUser = null;
let currentUserProfile = null;

/**
 * Check if user is authenticated
 * @param {boolean} redirectToLogin - Whether to redirect to login if not authenticated
 * @returns {Promise<Object|null>} User profile or null
 */
export async function checkAuth(redirectToLogin = false) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                currentUser = user;
                
                // Fetch user profile from Firestore
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userRef);
                    
                    if (userDoc.exists()) {
                        currentUserProfile = {
                            uid: user.uid,
                            email: user.email,
                            ...userDoc.data()
                        };
                        resolve(currentUserProfile);
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    resolve(null);
                }
            } else {
                // User is not signed in
                currentUser = null;
                currentUserProfile = null;
                
                if (redirectToLogin) {
                    window.location.href = '/login.html';
                }
                
                resolve(null);
            }
        });
    });
}

/**
 * Get current user profile
 * @returns {Object|null} User profile or null
 */
export function getCurrentUser() {
    return currentUserProfile;
}

/**
 * Get user's first name
 * @returns {string} First name or 'User'
 */
export function getUserFirstName() {
    if (!currentUserProfile || !currentUserProfile.name) return 'User';
    return currentUserProfile.name.split(' ')[0];
}

/**
 * Get user's full name
 * @returns {string} Full name or 'User'
 */
export function getUserFullName() {
    if (!currentUserProfile || !currentUserProfile.name) return 'User';
    return currentUserProfile.name;
}

/**
 * Sign out the current user
 */
export async function logout() {
    try {
        await signOut(auth);
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Update the navigation bar with user info
 * Call this function after DOM is loaded
 */
export function updateNavigation() {
    const navContainer = document.getElementById('user-nav');
    if (!navContainer) return;

    if (currentUserProfile) {
        // User is logged in
        navContainer.innerHTML = `
            <div class="user-menu">
                <span class="user-greeting">Hi, ${getUserFirstName()}!</span>
                <button id="logout-btn" class="logout-btn">Logout</button>
            </div>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', logout);
    } else {
        // User is not logged in
        navContainer.innerHTML = `
            <a href="/login.html" class="login-btn">Login</a>
        `;
    }
}

/**
 * Show personalized greeting
 * @param {string} elementId - ID of element to update
 */
export function showGreeting(elementId = 'user-greeting') {
    const element = document.getElementById(elementId);
    if (element && currentUserProfile) {
        element.textContent = `Welcome back, ${getUserFirstName()}!`;
    }
}

/**
 * Require authentication for premium content
 * Shows a message and login button if not authenticated
 * @param {string} containerId - ID of container for premium content
 */
export async function requireAuth(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = await checkAuth(false);
    
    if (!user) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #f8f9ff; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin-bottom: 15px; color: #333;">🔒 Premium Content</h3>
                <p style="margin-bottom: 20px; color: #666;">Sign in to access this feature</p>
                <a href="/login.html" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Sign In</a>
            </div>
        `;
        return false;
    }
    
    return true;
}
