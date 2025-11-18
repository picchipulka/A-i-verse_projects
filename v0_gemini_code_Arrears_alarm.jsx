import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PlusCircle, Trash2, Edit3, Save, XCircle, Clock, AlertTriangle, CheckCircle, Repeat, Calendar, Mail, Tag, Bell, DollarSign, List, FileText, ChevronDown, ChevronUp } from 'lucide-react';

// --- Global Variable Access ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'arrears-alarm-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Fixed color map for stable colors (Enhancement 2.a)
const TAG_COLOR_MAP = {
    'Rent/Mortgage': { bg: 'bg-blue-600/50', text: 'text-blue-200' },
    'Credit Card': { bg: 'bg-red-600/50', text: 'text-red-200' },
    'Loan': { bg: 'bg-purple-600/50', text: 'text-purple-200' },
    'Utilities (Electricity/Water)': { bg: 'bg-yellow-600/50', text: 'text-yellow-200' },
    'Insurance': { bg: 'bg-green-600/50', text: 'text-green-200' },
    'Subscription': { bg: 'bg-indigo-600/50', text: 'text-indigo-200' },
    'Tax': { bg: 'bg-amber-600/50', text: 'text-amber-200' },
    'Other': { bg: 'bg-gray-600/50', text: 'text-gray-200' },
};

// Initial Tags
const BASE_CATEGORY_TAGS = Object.keys(TAG_COLOR_MAP);

// ALERT SCHEDULE OPTIONS (Enhancement 1.a)
const ALERT_SCHEDULE_OPTIONS = [
    { value: 'default', label: 'Default: 1 Day Before & Due Day', daysBefore: 1 },
    { value: 'week', label: '1 Week Before (7 Days)', daysBefore: 7 },
    { value: 'fourdays', label: '4 Days Before', daysBefore: 4 },
    { value: 'off', label: 'Turn Off Alerts', daysBefore: Infinity },
];

// The main, default-exported component must be App
export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [payments, setPayments] = useState([]);
    const [customTags, setCustomTags] = useState([]); // State for user-defined tags (Enhancement 1.b)
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);
    const [displayName, setDisplayName] = useState(''); 
    
    // NEW: Tab state
    const [activeTab, setActiveTab] = useState('Upcoming'); 
    
    // Form state for adding/editing payments
    const [editingPayment, setEditingPayment] = useState(null);
    const [isCustomTagInputVisible, setIsCustomTagInputVisible] = useState(false);
    const [tempCustomTag, setTempCustomTag] = useState('');
    const [form, setForm] = useState({ 
        name: '', 
        amount: '', 
        dueDate: '', 
        status: 'Upcoming',
        isRecurring: false, 
        minPaymentAmount: '', 
        recurringStartDate: '', 
        categoryTag: BASE_CATEGORY_TAGS[0],
        alertSchedule: ALERT_SCHEDULE_OPTIONS[0].value, 
    });

    // Combined tags for the dropdown
    const allCategoryTags = useMemo(() => {
        return [...BASE_CATEGORY_TAGS, ...customTags];
    }, [customTags]);

    // --- Utility Functions ---

    /**
     * Finds the next valid due date based on the recurring day of the month.
     */
    const getNextRecurringDueDate = (dayOfMonth, referenceDateString = new Date().toISOString().substring(0, 10)) => {
        if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) return '';

        const today = new Date();
        const [refYear, refMonth] = referenceDateString.split('-').map(Number);
        
        let targetDate = new Date(refYear, refMonth - 1, dayOfMonth); 

        // If the target date is in the past, move to the next month
        if (targetDate.getTime() <= today.getTime() && dayOfMonth <= today.getDate()) {
            targetDate.setMonth(targetDate.getMonth() + 1);
        }
        
        // Handle last day of month logic (31st capping)
        if (dayOfMonth === 31) {
             const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
             targetDate.setDate(lastDay);
        } else if (targetDate.getDate() !== dayOfMonth) {
            // If it rolled over, set it to the last day of the current month
            targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
        }

        return targetDate.toISOString().substring(0, 10);
    };


    /**
     * Calculates the number of days until the due date, using UTC normalization 
     * for accurate day comparison regardless of user's timezone.
     */
    const getDaysUntilDue = (dueDate) => {
        if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return 9999;

        const today = new Date();
        const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        
        const [year, month, day] = dueDate.split('-').map(Number);
        const dueUtc = Date.UTC(year, month - 1, day); 

        const diffTime = dueUtc - todayUtc;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    
    /**
     * Calculates the simulated email alert statuses based on the due date and schedule. (Enhancement 1.a)
     */
    const getAlertStatus = useCallback((dueDate, scheduleValue = 'default') => {
        const days = getDaysUntilDue(dueDate);
        const status = { firstReminder: 'Skipped', finalReminder: 'Skipped' };
        
        if (scheduleValue === 'off') {
            status.firstReminder = 'Disabled';
            status.finalReminder = 'Disabled';
            return status;
        }

        const schedule = ALERT_SCHEDULE_OPTIONS.find(opt => opt.value === scheduleValue) || ALERT_SCHEDULE_OPTIONS[0];
        const daysBefore = schedule.daysBefore;

        // 1st Reminder: Based on configuration
        if (days === daysBefore) {
            status.firstReminder = 'Ready to Send';
        } else if (days < daysBefore) {
            status.firstReminder = 'Sent';
        } else {
            status.firstReminder = 'Upcoming';
        }

        // Final Reminder: On due date (days === 0)
        if (days === 0) {
            status.finalReminder = 'Ready to Send';
        } else if (days < 0) {
            status.finalReminder = 'Sent';
        } else {
             status.finalReminder = 'Upcoming';
        }
        
        // Cleanup for overdue status - if days < 0, both must be 'Sent'
        if (days < 0) {
            status.firstReminder = 'Sent';
            status.finalReminder = 'Sent';
        }
        
        return status;
    }, []);

    /**
     * Determines the card and urgency styling based on due date.
     */
    const getUrgencyClasses = (payment) => {
        if (payment.status === 'Paid') {
            return {
                border: 'border-green-500',
                bg: 'bg-green-900/10',
                text: 'text-green-300',
                icon: CheckCircle
            };
        }
        
        const days = getDaysUntilDue(payment.dueDate);

        if (days < 0) {
            return {
                border: 'border-red-500',
                bg: 'bg-red-900/30',
                text: 'text-red-300',
                icon: AlertTriangle
            };
        } else if (days <= 7) {
            return {
                border: 'border-yellow-500',
                bg: 'bg-yellow-900/20',
                text: 'text-yellow-300',
                icon: AlertTriangle
            };
        } else {
            return {
                border: 'border-blue-500',
                bg: 'bg-gray-800/50',
                text: 'text-blue-300',
                icon: Clock
            };
        }
    };
    
    // Function to get color for any tag, defaulting to a specific 'Other' color if not found (Enhancement 2.a)
    const getCategoryColor = (tag) => {
        // Find color in fixed map, or use a default 'custom' color
        return TAG_COLOR_MAP[tag] || { bg: 'bg-pink-600/50', text: 'text-pink-200' }; 
    };

    // --- Firestore Initialization, Authentication, and Profile ---

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribeAuth = firebaseAuth.onAuthStateChanged(async (user) => {
                if (!user) {
                    if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } catch (e) {
                            console.error("Custom token sign in failed, signing in anonymously:", e);
                            await signInAnonymously(firebaseAuth);
                        }
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                }
                
                const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
                setUserId(currentUserId);
                setIsAuthReady(true);
                
                if (firestoreDb && currentUserId) {
                    const profileRef = doc(firestoreDb, 'artifacts', appId, 'users', currentUserId, 'profile', 'data');
                    
                    onSnapshot(profileRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const profileData = docSnap.data();
                            setDisplayName(profileData.displayName || 'My Wallet');
                            // Load custom tags (Enhancement 1.b)
                            setCustomTags(profileData.customTags || []);
                        } else {
                            // Initialize profile with empty custom tags
                            setDoc(profileRef, { displayName: 'My Wallet', userId: currentUserId, customTags: [], createdAt: serverTimestamp() }, { merge: true });
                            setDisplayName('My Wallet');
                        }
                    }, (e) => console.error("Error loading profile:", e));
                }
            });

            return () => unsubscribeAuth();

        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setError("Could not initialize database. Check console for details.");
        }
    }, []);
    
    // Function to update the display name
    const handleUpdateDisplayName = async (newName) => {
        if (!db || !userId || !newName.trim()) return;
        try {
            const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
            await updateDoc(profileRef, { displayName: newName.trim(), updatedAt: serverTimestamp() });
        } catch (e) {
            console.error("Error updating display name:", e);
            setError(`Failed to update name: ${e.message}`);
        }
    };
    
    // Function to add a custom tag (Enhancement 1.b)
    const handleAddCustomTag = async () => {
        if (!db || !userId || !tempCustomTag.trim()) return;
        const newTag = tempCustomTag.trim();
        if (allCategoryTags.includes(newTag)) {
            setError(`Tag "${newTag}" already exists.`);
            return;
        }

        try {
            const profileRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
            await updateDoc(profileRef, { 
                customTags: [...customTags, newTag],
                updatedAt: serverTimestamp() 
            });
            setTempCustomTag('');
            setIsCustomTagInputVisible(false);
            setForm(prev => ({ ...prev, categoryTag: newTag }));
        } catch (e) {
            console.error("Error adding custom tag:", e);
            setError(`Failed to add custom tag: ${e.message}`);
        }
    };

    // --- Data Listener (Payments Collection) ---

    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
        const q = query(paymentsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPayments = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // Calculate alert status dynamically
                const alertStatus = getAlertStatus(data.dueDate, data.alertSchedule);
                
                return {
                    id: doc.id,
                    ...data,
                    dueDate: data.dueDate ? new Date(data.dueDate).toISOString().substring(0, 10) : '',
                    isRecurring: data.isRecurring || false,
                    minPaymentAmount: data.minPaymentAmount || '',
                    categoryTag: data.categoryTag || BASE_CATEGORY_TAGS[0],
                    alertSchedule: data.alertSchedule || ALERT_SCHEDULE_OPTIONS[0].value,
                    alertStatus: alertStatus,
                    updatedAtTimestamp: data.updatedAt?.toDate() || new Date(0), // For history sorting
                };
            });
            setPayments(fetchedPayments);
        }, (err) => {
            console.error("Firestore subscription failed:", err);
            setError("Failed to load payment data. Check network connection.");
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getAlertStatus]);

    // --- CRUD Operations ---

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        let newValue = type === 'checkbox' ? checked : value;
        
        setForm(prev => ({ 
            ...prev, 
            [name]: newValue 
        }));

        if (name === 'isRecurring' && !checked) {
            setForm(prev => ({ ...prev, dueDate: '', recurringStartDate: '' }));
        }
        
        // Handle custom tag selection logic (Enhancement 1.b)
        if (name === 'categoryTag') {
            if (value === 'Add Custom Tag...') {
                setIsCustomTagInputVisible(true);
            } else {
                setIsCustomTagInputVisible(false);
            }
        }
    };

    const resetForm = () => {
        setForm({ 
            name: '', 
            amount: '', 
            dueDate: '', 
            status: 'Upcoming',
            isRecurring: false, 
            minPaymentAmount: '',
            recurringStartDate: '',
            categoryTag: BASE_CATEGORY_TAGS[0],
            alertSchedule: ALERT_SCHEDULE_OPTIONS[0].value,
        });
        setEditingPayment(null);
        setIsCustomTagInputVisible(false);
        setTempCustomTag('');
        setError(null);
    };
    
    // NEW: Handle tab change and form reset
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        // Clear form if we leave the New Payment tab
        if (tabName !== 'New Payment') {
            setEditingPayment(null);
            resetForm(); 
        }
    };


    const handleSavePayment = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;

        const { name, amount, dueDate, isRecurring, minPaymentAmount, recurringStartDate, categoryTag, alertSchedule } = form;
        
        if (!name.trim()) { setError("Payment Name is required."); return; }
        if (isRecurring && !recurringStartDate) { setError("You must provide a Recurring Start Date."); return; }
        if (!isRecurring && !dueDate) { setError("Due Date is required for one-time payments."); return; }

        const parsedAmount = amount ? parseFloat(amount) : null;
        const parsedMinAmount = minPaymentAmount ? parseFloat(minPaymentAmount) : null;

        if (parsedAmount !== null && isNaN(parsedAmount)) { setError("Full Amount must be a number."); return; }
        if (parsedMinAmount !== null && isNaN(parsedMinAmount)) { setError("Min Payment Amount must be a number."); return; }

        setError(null);

        let finalDueDate = dueDate;
        let recurringDayOfMonth = null;

        if (isRecurring && recurringStartDate) {
            const dayOfMonth = new Date(recurringStartDate).getDate();
            recurringDayOfMonth = dayOfMonth;
            finalDueDate = getNextRecurringDueDate(dayOfMonth);
        }

        const paymentData = {
            name: name.trim(),
            amount: parsedAmount !== null ? parsedAmount.toFixed(2) : null,
            dueDate: finalDueDate, 
            status: form.status,
            isRecurring: isRecurring, 
            minPaymentAmount: parsedMinAmount !== null ? parsedMinAmount.toFixed(2) : null,
            recurringDayOfMonth: recurringDayOfMonth,
            categoryTag: categoryTag,
            alertSchedule: alertSchedule, 
            updatedAt: serverTimestamp()
        };

        try {
            const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
            if (editingPayment) {
                await updateDoc(doc(paymentsRef, editingPayment.id), paymentData);
            } else {
                await addDoc(paymentsRef, { ...paymentData, createdAt: serverTimestamp() });
            }
            // After save, switch to the Upcoming tab
            handleTabChange('Upcoming');
        } catch (e) {
            console.error("Error saving payment:", e);
            setError(`Failed to save payment: ${e.message}`);
        }
    };

    const handleEdit = (payment) => {
        setEditingPayment(payment);
        setForm({
            name: payment.name,
            amount: payment.amount || '', 
            dueDate: payment.dueDate,
            status: payment.status,
            isRecurring: payment.isRecurring || false,
            minPaymentAmount: payment.minPaymentAmount || '', 
            // Use current due date for recurring date input visualization for editing
            recurringStartDate: payment.dueDate, 
            categoryTag: payment.categoryTag || BASE_CATEGORY_TAGS[0],
            alertSchedule: payment.alertSchedule || ALERT_SCHEDULE_OPTIONS[0].value,
        });
        // Switch to the form tab
        setActiveTab('New Payment'); 
        setIsCustomTagInputVisible(false);
    };

    const handleDelete = async (id) => {
        if (!db || !userId) return;
        try {
            const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
            await deleteDoc(doc(paymentsRef, id));
        } catch (e) {
            console.error("Error deleting payment:", e);
            setError(`Failed to delete payment: ${e.message}`);
        }
    };

    const handleTogglePaid = async (payment) => {
        if (!db || !userId) return;
        
        let newStatus;
        let updateData = {};
        
        if (payment.status === 'Paid') {
            // Revert to Upcoming
            newStatus = 'Upcoming';
            updateData = { status: newStatus, updatedAt: serverTimestamp(), dueDate: payment.dueDate }; // Keep old date for history
        } else {
            // Check Guardrail (Enhancement 2.c): Only allow marking as paid if payment is due within 30 days
            if (payment.isRecurring) {
                const daysUntilDue = getDaysUntilDue(payment.dueDate);
                if (daysUntilDue >= 30) {
                    setError("Payment guardrail active: You can only mark recurring payments as paid within 30 days of the due date to prevent accidental future roll-overs. Please pay when the due date is closer.");
                    return;
                }
            }
            
            // Mark as Paid
            newStatus = 'Paid';
            updateData = { status: newStatus, updatedAt: serverTimestamp() };

            // If recurring, calculate next due date (rollover logic)
            if (payment.isRecurring && payment.recurringDayOfMonth) {
                const currentDueDate = new Date(payment.dueDate);
                // Set reference to one day after the paid date to ensure next month is picked up
                const nextMonthRef = new Date(currentDueDate.getFullYear(), currentDueDate.getMonth(), currentDueDate.getDate() + 1); 
                
                const nextDueDate = getNextRecurringDueDate(payment.recurringDayOfMonth, nextMonthRef.toISOString().substring(0, 10));
                
                // Mark as Paid and set the new due date
                updateData.dueDate = nextDueDate;
                updateData.status = 'Upcoming'; // Immediately reset to upcoming for the new cycle
            }
        }
        
        try {
            const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
            await updateDoc(doc(paymentsRef, payment.id), updateData);
        } catch (e) {
            console.error("Error updating status:", e);
            setError(`Failed to update status: ${e.message}`);
        }
    };

    // --- Computed Data ---
    // Sorts by Overdue -> Closest Upcoming -> Paid Last (Enhancement 2.b)
    const sortedPayments = useMemo(() => {
        return [...payments]
            .map(p => ({
                ...p,
                daysUntilDue: p.status === 'Paid' ? Infinity : getDaysUntilDue(p.dueDate)
            }))
            .sort((a, b) => {
                // 1. Paid items always go last in this primary sort for the Upcoming view context
                if (a.status === 'Paid' && b.status !== 'Paid') return 1;
                if (a.status !== 'Paid' && b.status === 'Paid') return -1;
                
                // 2. Sort by Days Until Due (lowest/most negative first = Overdue/Closest Upcoming)
                return a.daysUntilDue - b.daysUntilDue;
            });
    }, [payments]);
    
    // Filtered lists for tabs
    const upcomingPayments = useMemo(() => sortedPayments.filter(p => p.status !== 'Paid'), [sortedPayments]);
    const historyPayments = useMemo(() => {
        // Sort history by most recently paid (updatedAtTimestamp descending)
        return sortedPayments
            .filter(p => p.status === 'Paid')
            .sort((a, b) => b.updatedAtTimestamp - a.updatedAtTimestamp);
    }, [sortedPayments]);

    const overdueCount = upcomingPayments.filter(p => p.daysUntilDue < 0).length;
    
    // Alert aggregation logic
    const dailyAlerts = useMemo(() => {
        const alerts = [];
        
        const imminentPayments = upcomingPayments.filter(p => 
            p.daysUntilDue >= 0 && p.daysUntilDue <= 2
        );

        const groupedByDate = imminentPayments.reduce((acc, payment) => {
            const date = payment.dueDate;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(payment);
            return acc;
        }, {});

        for (const date in groupedByDate) {
            const paymentsOnDay = groupedByDate[date];
            const days = paymentsOnDay[0].daysUntilDue; 
            const totalAmount = paymentsOnDay.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            
            let message = '';
            if (days === 0) {
                message = `Total of $${totalAmount.toFixed(2)} DUE TODAY for ${paymentsOnDay.length} item(s)!`;
            } else if (days === 1) {
                message = `Total of $${totalAmount.toFixed(2)} DUE TOMORROW for ${paymentsOnDay.length} item(s)!`;
            } else if (days === 2) {
                message = `Total of $${totalAmount.toFixed(2)} due on ${date} (in 2 days) for ${paymentsOnDay.length} item(s).`;
            }
            
            if (message) {
                alerts.push({ date, days, message, count: paymentsOnDay.length, totalAmount: totalAmount.toFixed(2) });
            }
        }
        
        return alerts.sort((a, b) => a.days - b.days);

    }, [upcomingPayments]); 
    
    // --- Components & Render ---
    
    const UserProfileCard = ({ displayName, onUpdateDisplayName, userId }) => {
        const [isEditingName, setIsEditingName] = useState(false);
        const [tempName, setTempName] = useState(displayName);
        
        useEffect(() => {
            setTempName(displayName);
        }, [displayName]);

        const saveName = () => {
            onUpdateDisplayName(tempName);
            setIsEditingName(false);
        };
        
        return (
            <div className="mt-4 flex flex-col items-center">
                <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-bold text-white">
                        {isEditingName ? (
                            <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="bg-gray-700 border border-indigo-500 rounded-lg px-2 py-1 text-white text-center"
                                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
                                autoFocus
                            />
                        ) : (
                            <span>{displayName}'s Wallet</span>
                        )}
                    </h2>
                    
                    {isEditingName ? (
                        <div className="flex space-x-1">
                            <button onClick={saveName} className="p-1 rounded-full text-green-400 hover:text-green-300 transition" title="Save Name">
                                <Save className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsEditingName(false)} className="p-1 rounded-full text-red-400 hover:text-red-300 transition" title="Cancel Edit">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditingName(true)} className="p-1 rounded-full text-indigo-400 hover:text-indigo-300 transition" title="Edit Name">
                            <Edit3 className="w-5 h-5" />
                        </button>
                    )}
                </div>
                 {userId && (
                    <p className="text-xs text-gray-500 mt-1">
                        User ID: {userId}
                    </p>
                )}
            </div>
        );
    };


    const PaymentForm = () => (
        <form onSubmit={handleSavePayment} className="space-y-4 p-6 bg-gray-800 rounded-xl shadow-lg border border-indigo-700">
            <h3 className="text-xl font-semibold text-indigo-400">{editingPayment ? 'Edit Payment' : 'Add New Payment'}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* Name */}
                <div className="md:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Payment Name</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            value={form.name} 
                            onChange={handleFormChange}
                            placeholder="e.g., Rent, Credit Card, Electricity"
                            className="w-full pl-3 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {/* Is Recurring Checkbox */}
                 <div className="col-span-1 flex items-center h-10 md:col-span-3">
                    <input
                        id="isRecurring"
                        name="isRecurring"
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={handleFormChange}
                        className="h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <label htmlFor="isRecurring" className="ml-3 text-sm font-medium text-gray-300">
                        Recurring Payment (Set Monthly)
                    </label>
                </div>
                
                {/* Due Date or Recurring Date Input (Conditional - Enhancement 1) */}
                <div className={`col-span-1 ${form.isRecurring ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
                    {form.isRecurring ? (
                        <>
                            <label htmlFor="recurringStartDate" className="block text-sm font-medium text-gray-300 mb-1">Recurring Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
                                <input 
                                    type="date" 
                                    name="recurringStartDate" 
                                    id="recurringStartDate" 
                                    value={form.recurringStartDate} 
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    required 
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Payment alert notification will start recurring from (n-1) days by default. If you want to enhance your alerts schedule them below.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">One-Time Due Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
                                <input 
                                    type="date" 
                                    name="dueDate" 
                                    id="dueDate" 
                                    value={form.dueDate} 
                                    onChange={handleFormChange}
                                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Alert Schedule Selection (Enhancement 1.a) */}
                <div className="col-span-1">
                    <label htmlFor="alertSchedule" className="block text-sm font-medium text-gray-300 mb-1">Alert Schedule</label>
                    <div className="relative">
                        <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
                        <select 
                            name="alertSchedule" 
                            id="alertSchedule" 
                            value={form.alertSchedule} 
                            onChange={handleFormChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {ALERT_SCHEDULE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Tag (Enhancement 1.b) */}
                 <div className="col-span-1">
                    <label htmlFor="categoryTag" className="block text-sm font-medium text-gray-300 mb-1">Category Tag</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
                        <select 
                            name="categoryTag" 
                            id="categoryTag" 
                            value={form.categoryTag} 
                            onChange={handleFormChange}
                            className="w-full pl-10 pr-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {allCategoryTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                            <option value="Add Custom Tag...">--- Add Custom Tag... ---</option>
                        </select>
                    </div>
                </div>
                
                {/* Custom Tag Input (Enhancement 1.b) */}
                {isCustomTagInputVisible && (
                    <div className="col-span-1 flex space-x-2">
                        <input 
                            type="text" 
                            value={tempCustomTag} 
                            onChange={(e) => setTempCustomTag(e.target.value)}
                            placeholder="Enter new tag name"
                            className="w-full pl-3 pr-3 py-2 bg-gray-700 border border-indigo-500 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button 
                            type="button" 
                            onClick={handleAddCustomTag}
                            className="p-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>
                    </div>
                )}


                {/* Full Amount (Optional) */}
                <div className="col-span-1">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">Full Amount (Optional $)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            name="amount" 
                            id="amount" 
                            value={form.amount} 
                            onChange={handleFormChange}
                            step="0.01"
                            placeholder="1500.00"
                            className="w-full pl-3 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                
                {/* Min Payment Amount (Optional) */}
                 <div className="col-span-1">
                    <label htmlFor="minPaymentAmount" className="block text-sm font-medium text-gray-300 mb-1">Min Payment (Optional $)</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            name="minPaymentAmount" 
                            id="minPaymentAmount" 
                            value={form.minPaymentAmount} 
                            onChange={handleFormChange}
                            step="0.01"
                            placeholder="50.00 (If applicable)"
                            className="w-full pl-3 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Status */}
                <div className="col-span-1">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select 
                        name="status" 
                        id="status" 
                        value={form.status} 
                        onChange={handleFormChange}
                        className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Paid">Paid</option>
                    </select>
                </div>
                
            </div>

            <div className="flex justify-end space-x-3 pt-2">
                <button 
                    type="button" 
                    onClick={resetForm}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition"
                >
                    <XCircle className="w-5 h-5 mr-2" /> {editingPayment ? 'Cancel Edit' : 'Clear Form'}
                </button>
                <button 
                    type="submit" 
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/50"
                >
                    <Save className="w-5 h-5 mr-2" /> {editingPayment ? 'Update Payment' : 'Add Payment'}
                </button>
            </div>
        </form>
    );
    
    // Component for displaying alert status
    const AlertStatusPill = ({ label, status }) => {
        let colorClass = '';
        let icon = Mail;
        
        switch (status) {
            case 'Ready to Send':
                colorClass = 'bg-yellow-600/50 text-yellow-200';
                break;
            case 'Sent':
                colorClass = 'bg-green-600/50 text-green-200';
                icon = CheckCircle;
                break;
            case 'Disabled':
                colorClass = 'bg-gray-700/50 text-gray-400';
                icon = XCircle;
                break;
            case 'Skipped': 
            case 'Upcoming':
            default:
                colorClass = 'bg-indigo-600/50 text-indigo-200';
                icon = Clock;
        }

        return (
             <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center ${colorClass}`}>
                {React.createElement(icon, { className: "w-3 h-3 mr-1" })}
                {label}: {status}
            </span>
        );
    };


    const PaymentItem = ({ payment }) => {
        const { border, bg, text, icon: Icon } = getUrgencyClasses(payment);
        const { bg: tagBg, text: tagText } = getCategoryColor(payment.categoryTag); 
        const daysUntilDue = getDaysUntilDue(payment.dueDate);
        
        const DueInfo = () => {
            if (payment.status === 'Paid') {
                return <span className="text-green-400 font-bold flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> PAID</span>;
            } else if (daysUntilDue < 0) {
                return <span className="text-red-400 font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> OVERDUE ({Math.abs(daysUntilDue)}d ago)</span>;
            } else if (daysUntilDue === 0) {
                return <span className="text-yellow-400 font-bold flex items-center"><Clock className="w-4 h-4 mr-1" /> DUE TODAY</span>;
            } else if (daysUntilDue === 1) {
                return <span className="text-yellow-400 font-bold flex items-center"><Clock className="w-4 h-4 mr-1" /> DUE TOMORROW</span>;
            } else {
                return <span className="text-blue-400 font-bold">{daysUntilDue} days left</span>;
            }
        };
        
        const displayAmount = payment.amount ? `$${payment.amount}` : 'N/A';
        const displayMinAmount = payment.minPaymentAmount ? `$${payment.minPaymentAmount}` : '';
    
        return (
            <div className={`flex flex-col justify-between items-start p-4 rounded-xl shadow-md transition-all ${bg} ${border} border-l-4`}>
                <div className="w-full flex justify-between items-start mb-3">
                    <div className="flex-grow space-y-1">
                        <div className="flex items-center">
                            <Icon className={`w-5 h-5 mr-3 ${text}`} />
                            <h4 className="text-lg font-bold text-white">{payment.name}</h4>
                            
                            {/* Tags */}
                            <div className="ml-4 flex flex-wrap space-x-2">
                                {/* Category Tag with dynamic color */}
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center ${tagBg} ${tagText}`}>
                                    <Tag className="w-3 h-3 mr-1" /> {payment.categoryTag}
                                </span>
                                
                                {/* Recurring/One-Time Tag */}
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center ${payment.isRecurring ? 'bg-indigo-600/50 text-indigo-200' : 'bg-green-600/50 text-green-200'}`}>
                                    {payment.isRecurring ? <Repeat className="w-3 h-3 mr-1" /> : <Calendar className="w-3 h-3 mr-1" />} 
                                    {payment.isRecurring ? 'Recurring' : 'One-Time'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-8 text-sm text-gray-400 ml-8">
                            <p className="text-2xl font-extrabold text-indigo-300">
                                {displayAmount}
                                {displayMinAmount && <span className="text-sm font-normal text-gray-400 ml-2">(Min: {displayMinAmount})</span>}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 sm:mt-0">
                                <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    <span>Due: {payment.dueDate}</span>
                                </div>
                                <DueInfo />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2 flex-shrink-0">
                        {payment.status !== 'Paid' && (
                            <button 
                                onClick={() => handleTogglePaid(payment)}
                                className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition"
                                title="Mark as Paid (and roll over recurring)"
                            >
                                <CheckCircle className="w-5 h-5" />
                            </button>
                        )}
                        {payment.status === 'Paid' && (
                             <button 
                                onClick={() => handleTogglePaid(payment)}
                                className="p-2 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition"
                                title="Mark as Upcoming"
                            >
                                <Clock className="w-5 h-5" />
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handleEdit(payment)}
                            className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition"
                            title="Edit Payment"
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                        
                        <button 
                            onClick={() => handleDelete(payment.id)}
                            className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                            title="Delete Payment"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                {/* Alert Statuses */}
                {payment.status !== 'Paid' && (
                    <div className="w-full pt-2 border-t border-gray-700 mt-2 flex flex-wrap gap-3">
                        <AlertStatusPill label="1st Reminder" status={payment.alertStatus.firstReminder} />
                        <AlertStatusPill label="Final Reminder" status={payment.alertStatus.finalReminder} />
                    </div>
                )}
            </div>
        );
    };
    
    const TabButton = ({ tabName, icon: Icon, count, onClick }) => {
        const isActive = activeTab === tabName;
        
        let colorClass = isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white';
            
        return (
            <button
                onClick={() => onClick(tabName)}
                className={`flex items-center justify-center sm:justify-start px-4 py-2 font-medium rounded-lg transition w-full sm:w-auto ${colorClass}`}
            >
                <Icon className="w-5 h-5 mr-2" /> 
                {tabName}
                {count !== undefined && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-gray-800/50 text-indigo-300">
                        {count}
                    </span>
                )}
            </button>
        );
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Upcoming':
                return (
                    <div className="card p-6 rounded-xl space-y-4">
                        <h2 className="text-2xl font-semibold text-indigo-400">
                            Upcoming Payments ({upcomingPayments.length})
                        </h2>
                        {upcomingPayments.length === 0 ? (
                            <p className="text-gray-500 italic p-4 text-center">
                                No upcoming payments. Switch to the 'New Payment' tab to add one!
                            </p>
                        ) : (
                            upcomingPayments.map(payment => (
                                <PaymentItem key={payment.id} payment={payment} />
                            ))
                        )}
                    </div>
                );
            case 'History':
                 return (
                    <div className="card p-6 rounded-xl space-y-4">
                        <h2 className="text-2xl font-semibold text-green-400">
                            Paid History ({historyPayments.length})
                        </h2>
                        {historyPayments.length === 0 ? (
                            <p className="text-gray-500 italic p-4 text-center">
                                No payments have been marked as paid yet.
                            </p>
                        ) : (
                            historyPayments.map(payment => (
                                <PaymentItem key={payment.id} payment={payment} />
                            ))
                        )}
                    </div>
                );
            case 'New Payment':
                return <PaymentForm />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-900 text-white font-sans flex flex-col items-center">
            <style>{`
                body {
                    font-family: 'Inter', sans-serif;
                    background-image: radial-gradient(circle at 10% 20%, rgba(20, 20, 40, 1) 0%, rgba(20, 20, 40, 0.9) 50%, rgba(20, 20, 40, 0.8) 100%);
                    min-height: 100vh;
                }
                .card {
                    background-color: #1f2937;
                    border: 1px solid #374151;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                }
            `}</style>
            
            <header className="w-full max-w-4xl text-center mb-6">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-indigo-400">
                    A(I)VERSE: Arrears Alarm
                </h1>
                
                <UserProfileCard displayName={displayName} onUpdateDisplayName={handleUpdateDisplayName} userId={userId} />

                <p className="text-indigo-300 mt-2">
                    Your manual payment sentinel. Never pay a late fee again.
                </p>
                
            </header>

            <main className="w-full max-w-4xl space-y-6">
                
                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center justify-between">
                        <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-3" />
                            {error}
                        </div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                )}
                
                {/* Overdue Alert Card */}
                {overdueCount > 0 && (
                    <div className="p-4 bg-red-800/50 border border-red-600 rounded-xl shadow-lg flex items-center justify-between animate-pulse">
                        <div className="flex items-center">
                            <AlertTriangle className="w-6 h-6 text-red-300 mr-3" />
                            <span className="text-xl font-bold text-red-200">{overdueCount} {overdueCount === 1 ? 'Payment' : 'Payments'} OVERDUE!</span>
                        </div>
                    </div>
                )}
                
                {/* Daily Imminent Alert Cards (2-Day Lookahead Aggregation) */}
                {dailyAlerts.map(alert => (
                    <div key={alert.date} className="p-4 bg-yellow-800/50 border border-yellow-600 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between">
                        <div className="flex items-center">
                            <AlertTriangle className="w-6 h-6 text-yellow-300 mr-3 flex-shrink-0" />
                            <span className="text-base sm:text-lg font-bold text-yellow-200 text-center sm:text-left">{alert.message}</span>
                        </div>
                        <span className="text-sm text-yellow-300 mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                            Action Required!
                        </span>
                    </div>
                ))}
                
                {/* --- TAB NAVIGATION --- */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
                    <TabButton 
                        tabName="Upcoming" 
                        icon={List} 
                        count={upcomingPayments.length} 
                        onClick={handleTabChange} 
                    />
                    <TabButton 
                        tabName="History" 
                        icon={FileText} 
                        count={historyPayments.length} 
                        onClick={handleTabChange} 
                    />
                    <TabButton 
                        tabName="New Payment" 
                        icon={PlusCircle} 
                        onClick={handleTabChange} 
                    />
                </div>
                
                {/* --- TAB CONTENT RENDERING --- */}
                {renderContent()}

            </main>
        </div>
    );
}