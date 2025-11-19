import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, query, where, Timestamp, setLogLevel } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// --- Global Initialization (Required for Canvas Environment) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Ensure Tailwind is loaded globally (standard practice for Canvas/React apps)
// The Lucide icons library is also assumed to be loaded globally via a separate script tag.

/**
 * Utility to safely get a Lucide Icon component from the global window.lucide object.
 * This function resolves the "Element type is invalid" error by ensuring a valid
 * component function (or the default 'Tag' icon) is always returned to React's renderer.
 * @param {string} iconName The name of the icon (e.g., 'Home', 'CreditCard').
 * @returns {React.Component | function} The Lucide icon component or the fallback Tag icon.
 */
const getIconComponent = (iconName) => {
    // Ensure both the global lucide object exists AND the specific icon exists on it.
    if (window.lucide && iconName && window.lucide[iconName]) {
        return window.lucide[iconName];
    }
    // Fallback if the icon is not found or lucide is not ready
    return window.lucide?.Tag || (() => <div className="w-4 h-4 bg-gray-400 rounded-full"></div>);
};


// --- App Component ---
const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', amount: '', dueDate: '', isRecurring: true, category: 'Home' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState(null);

    // Hardcoded list of categories and available Lucide Icons
    const categories = useMemo(() => [
        { name: 'Home', icon: 'Home' },
        { name: 'Rent/Mortgage', icon: 'House' },
        { name: 'Utilities', icon: 'Zap' },
        { name: 'Credit Card', icon: 'CreditCard' },
        { name: 'Subscription', icon: 'Repeat' },
        { name: 'Loan', icon: 'Banknote' },
        { name: 'Other', icon: 'Tag' },
    ], []);

    // 1. Firebase Initialization and Authentication
    useEffect(() => {
        try {
            setLogLevel('debug');
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (!user) {
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                }
                setUserId(firebaseAuth.currentUser?.uid || 'anonymous');
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setError("Failed to initialize the database. Check console for details.");
            setIsLoading(false);
        }
    }, []);

    // Utility function to get the status of a payment
    const getPaymentStatus = useCallback((dueDate) => {
        if (!dueDate) return 'Good';
        const now = new Date();
        const due = dueDate.toDate();
        due.setHours(23, 59, 59, 999); // Treat the whole day as due
        
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Overdue';
        if (diffDays <= 7) return 'Imminent';
        return 'Good';
    }, []);

    // Utility to calculate the next recurring due date
    const calculateNextDueDate = useCallback((currentDate) => {
        const nextDate = new Date(currentDate.toDate());
        nextDate.setMonth(nextDate.getMonth() + 1);

        // Fix for month overflow (e.g., trying to set day 31 in a 30-day month)
        // Set the date to day 0 of the *next* month (which is the last day of the current month)
        if (nextDate.getDate() < currentDate.toDate().getDate()) {
            nextDate.setDate(0); 
        }

        return Timestamp.fromDate(nextDate);
    }, []);

    // 2. Real-time Data Listener
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const paymentsCollectionPath = `artifacts/${appId}/users/${userId}/payments`;
        const q = query(collection(db, paymentsCollectionPath));

        setIsLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                };
            });
            // Sort by due date (client-side sorting to avoid Firestore index issues)
            paymentsData.sort((a, b) => (a.dueDate?.toDate() || new Date(0)) - (b.dueDate?.toDate() || new Date(0)));
            setPayments(paymentsData);
            setIsLoading(false);
        }, (err) => {
            console.error("Firestore data fetch failed:", err);
            setError("Failed to load payments data. You might need to refresh.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady]);

    // Handlers
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSavePayment = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;
        setIsSaving(true);
        setError(null);

        try {
            const paymentData = {
                name: formData.name,
                amount: parseFloat(formData.amount),
                dueDate: Timestamp.fromDate(new Date(formData.dueDate)),
                isRecurring: formData.isRecurring,
                category: formData.category,
                isPaid: false,
                paidDate: null,
                createdAt: Timestamp.now(),
            };

            const docRef = doc(db, `artifacts/${appId}/users/${userId}/payments`, formData.id || crypto.randomUUID());
            await setDoc(docRef, paymentData, { merge: true });

            // Reset form and close modal
            setFormData({ id: '', name: '', amount: '', dueDate: '', isRecurring: true, category: 'Home' });
            setIsModalOpen(false);

        } catch (e) {
            console.error("Error saving document: ", e);
            setError("Failed to save payment. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (payment) => {
        // Convert Firestore Timestamp to YYYY-MM-DD string for input
        const dateString = payment.dueDate ? payment.dueDate.toDate().toISOString().split('T')[0] : '';
        setFormData({
            id: payment.id,
            name: payment.name,
            amount: payment.amount.toString(),
            dueDate: dateString,
            isRecurring: payment.isRecurring,
            category: payment.category,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!db || !userId) return;
        
        // Custom confirmation modal implementation (required as window.confirm is forbidden)
        if (window.confirm('Are you sure you want to delete this payment?')) {
            try {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/payments`, id);
                await deleteDoc(docRef);
            } catch (e) {
                console.error("Error deleting document: ", e);
                setError("Failed to delete payment.");
            }
        }
    };

    const handleMarkPaid = async (payment) => {
        if (!db || !userId || payment.isPaid) return;
        setIsSaving(true);

        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/payments`, payment.id);

            if (payment.isRecurring) {
                // For recurring payments, create the next installment
                const nextDueDate = calculateNextDueDate(payment.dueDate);

                const newPaymentData = {
                    name: payment.name,
                    amount: payment.amount,
                    dueDate: nextDueDate,
                    isRecurring: true,
                    category: payment.category,
                    isPaid: false,
                    paidDate: null,
                    createdAt: Timestamp.now(),
                };
                
                const newDocRef = doc(db, `artifacts/${appId}/users/${userId}/payments`, crypto.randomUUID());
                await setDoc(newDocRef, newPaymentData);

                // Update the current payment as paid
                await setDoc(docRef, { isPaid: true, paidDate: Timestamp.now() }, { merge: true });
                
            } else {
                // For one-time payments, just mark it as paid
                await setDoc(docRef, { isPaid: true, paidDate: Timestamp.now() }, { merge: true });
            }
        } catch (e) {
            console.error("Error marking paid:", e);
            setError("Failed to process payment status.");
        } finally {
            setIsSaving(false);
        }
    };

    const openAddModal = () => {
        // Reset form for new entry
        setFormData({ id: '', name: '', amount: '', dueDate: '', isRecurring: true, category: 'Home' });
        setIsModalOpen(true);
    };

    // --- Component Styling Utilities ---
    const getStatusClasses = (status) => {
        switch (status) {
            case 'Overdue': return 'bg-red-100 text-red-800 border-red-500';
            case 'Imminent': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
            case 'Good': return 'bg-green-100 text-green-800 border-green-500';
            default: return 'bg-gray-100 text-gray-800 border-gray-400';
        }
    };

    // --- Sub-Components ---

    const PaymentCard = ({ payment }) => {
        const { name, amount, dueDate, category, isPaid, id } = payment;
        const status = isPaid ? 'Paid' : getPaymentStatus(dueDate);
        const statusClasses = getStatusClasses(status);
        
        // Find the correct icon name based on category
        const categoryConfig = categories.find(c => c.name === category);
        const iconName = categoryConfig ? categoryConfig.icon : 'Tag';
        
        // FIXED: Use the robust utility function to get the component
        const IconComponent = getIconComponent(iconName);

        const formattedDate = dueDate ? dueDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        const formattedAmount = `$${amount.toFixed(2)}`;
        
        return (
            <div className={`flex items-center justify-between p-4 mb-3 rounded-xl shadow-lg transition duration-200 ${isPaid ? 'bg-gray-50 border border-dashed border-gray-300' : 'bg-white border-b-4 ' + statusClasses}`}>
                <div className="flex items-center space-x-4 flex-grow min-w-0">
                    <div className={`p-3 rounded-full ${isPaid ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                        <IconComponent size={20} className={`${isPaid ? 'text-gray-500' : 'text-indigo-600'}`} />
                    </div>
                    <div className="min-w-0 flex-grow">
                        <p className={`font-semibold truncate ${isPaid ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{name}</p>
                        <p className={`text-xs ${isPaid ? 'text-gray-400' : 'text-gray-500'}`}>{category}</p>
                    </div>
                </div>
                
                <div className="text-right ml-4">
                    <p className={`font-bold text-lg ${isPaid ? 'text-gray-400' : status === 'Overdue' ? 'text-red-600' : 'text-gray-800'}`}>
                        {formattedAmount}
                    </p>
                    <p className={`text-sm font-medium ${isPaid ? 'text-gray-400' : status === 'Overdue' ? 'text-red-500' : 'text-gray-500'}`}>
                        {status === 'Paid' ? 'Paid' : `Due: ${formattedDate}`}
                    </p>
                </div>
                
                {!isPaid && (
                    <div className="flex space-x-2 ml-4">
                        <button
                            onClick={() => handleMarkPaid(payment)}
                            className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-md transition duration-150 transform hover:scale-105"
                            title="Mark as Paid"
                            disabled={isSaving}
                        >
                            <getIconComponent('Check') size={16} />
                        </button>
                        <button
                            onClick={() => handleEdit(payment)}
                            className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition duration-150 transform hover:scale-105"
                            title="Edit"
                        >
                            <getIconComponent('Pencil') size={16} />
                        </button>
                    </div>
                )}
                {isPaid && (
                    <button
                        onClick={() => handleDelete(id)}
                        className="p-2 ml-4 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-md transition duration-150 transform hover:scale-105"
                        title="Delete"
                    >
                        <getIconComponent('Trash') size={16} />
                    </button>
                )}
            </div>
        );
    };

    const Modal = () => {
        const isEditing = !!formData.id;
        
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={() => setIsModalOpen(false)}>
                <div 
                    className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-100" 
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                        {isEditing ? 'Edit Payment' : 'Add New Payment'}
                    </h2>
                    <form onSubmit={handleSavePayment} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Payment Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g., Monthly Rent, Netflix"
                            />
                        </div>
                        <div className="flex space-x-4">
                            <div className="w-1/2">
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ($)</label>
                                <input
                                    type="number"
                                    id="amount"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="100.00"
                                />
                            </div>
                            <div className="w-1/2">
                                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                                <input
                                    type="date"
                                    id="dueDate"
                                    name="dueDate"
                                    value={formData.dueDate}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <div className="w-1/2">
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl shadow-sm"
                                >
                                    {categories.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-1/2 flex items-center pt-5">
                                <input
                                    id="isRecurring"
                                    name="isRecurring"
                                    type="checkbox"
                                    checked={formData.isRecurring}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isRecurring" className="ml-2 block text-sm font-medium text-gray-700">
                                    Monthly Recurring
                                </label>
                            </div>
                        </div>
                        
                        <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2 text-white bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.01] disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : (isEditing ? 'Update Payment' : 'Add Payment')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const InfoBlock = ({ title, value, icon, color }) => {
        const Icon = getIconComponent(icon);
        return (
            <div className={`p-4 rounded-xl shadow-md bg-white border-l-4 border-${color}-500 flex items-center justify-between`}>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-2 rounded-full bg-${color}-100`}>
                    <Icon size={24} className={`text-${color}-600`} />
                </div>
            </div>
        );
    };

    // Calculate Summary Stats
    const { totalDue, imminentCount, overdueCount } = useMemo(() => {
        let total = 0;
        let imminent = 0;
        let overdue = 0;

        payments.filter(p => !p.isPaid).forEach(p => {
            total += p.amount;
            const status = getPaymentStatus(p.dueDate);
            if (status === 'Imminent') imminent++;
            if (status === 'Overdue') overdue++;
        });

        return {
            totalDue: total,
            imminentCount: imminent,
            overdueCount: overdue,
        };
    }, [payments, getPaymentStatus]);

    if (!isAuthReady || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-600">
                        {isAuthReady ? 'Loading Payments...' : 'Authenticating...'}
                    </p>
                </div>
            </div>
        );
    }
    
    // Split payments into upcoming (not paid) and paid
    const upcomingPayments = payments.filter(p => !p.isPaid);
    const paidPayments = payments.filter(p => p.isPaid).slice(0, 5); // Show last 5 paid

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                /* Custom styles for component utility colors */
                .border-red-500 { border-color: #ef4444; }
                .border-yellow-500 { border-color: #f59e0b; }
                .border-green-500 { border-color: #10b981; }
                .text-red-500 { color: #ef4444; }
                .text-yellow-500 { color: #f59e0b; }
                .text-green-500 { color: #10b981; }
                `}
            </style>
            
            <Modal />

            {/* Header and Add Button */}
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Arrears Alarm</h1>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-2 px-4 py-2 text-white bg-indigo-600 rounded-xl shadow-lg hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.05]"
                >
                    <getIconComponent('Plus') size={20} />
                    <span className="font-semibold">Add Payment</span>
                </button>
            </header>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                <InfoBlock 
                    title="Total Due" 
                    value={`$${totalDue.toFixed(2)}`} 
                    icon="Wallet" 
                    color="indigo" 
                />
                <InfoBlock 
                    title="Imminent" 
                    value={`${imminentCount} items`} 
                    icon="Clock" 
                    color="yellow" 
                />
                <InfoBlock 
                    title="Overdue" 
                    value={`${overdueCount} items`} 
                    icon="AlertTriangle" 
                    color="red" 
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500 text-white p-4 rounded-xl mb-4 flex items-center justify-between shadow-md">
                    <span><getIconComponent('AlertCircle') size={20} className="inline mr-2" /> {error}</span>
                    <button onClick={() => setError(null)} className="font-bold">Dismiss</button>
                </div>
            )}
            
            {/* User ID (Mandatory for multi-user/collaborative environments) */}
            <div className="mb-6 p-3 bg-white rounded-xl shadow-sm text-sm text-gray-600 overflow-x-auto">
                <span className="font-medium text-gray-800">User ID:</span> 
                <code className="text-indigo-600 ml-2 select-all break-all">{userId}</code>
            </div>

            {/* Upcoming Payments List */}
            <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Upcoming Payments ({upcomingPayments.length})</h2>
                {upcomingPayments.length === 0 ? (
                    <div className="p-10 text-center bg-white rounded-xl shadow-lg text-gray-500">
                        <getIconComponent('CheckSquare') size={32} className="mx-auto text-green-500 mb-2" />
                        <p className="font-semibold">All clear! No upcoming payments to worry about.</p>
                        <p className="text-sm mt-1">Click "Add Payment" to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {upcomingPayments.map(p => <PaymentCard key={p.id} payment={p} />)}
                    </div>
                )}
            </section>

            {/* Recently Paid List */}
            {paidPayments.length > 0 && (
                <section>
                    <h2 className="text-xl font-bold text-gray-600 mb-4 border-b pb-2">Recently Paid</h2>
                    <div className="space-y-4 opacity-70">
                        {paidPayments.map(p => <PaymentCard key={p.id} payment={p} />)}
                    </div>
                </section>
            )}
        </div>
    );
};

export default App;