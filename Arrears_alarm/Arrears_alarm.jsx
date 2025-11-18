import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Trash2, Edit3, Save, XCircle, DollarSign, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

// --- Global Variable Access ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'arrears-alarm-app';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The main, default-exported component must be App
export default function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [payments, setPayments] = useState([]);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [error, setError] = useState(null);

    // Form state for adding/editing payments
    const [isAdding, setIsAdding] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [form, setForm] = useState({ name: '', amount: '', dueDate: '', status: 'Upcoming' });

    // --- Utility Functions ---

    /**
     * Calculates the number of days until the due date.
     * Returns a number (positive for future, negative for past/overdue).
     */
    const getDaysUntilDue = (dueDate) => {
        const today = new Date();
        // Zero out time components for accurate day comparison
        today.setHours(0, 0, 0, 0); 
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0); 

        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

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
    
    // --- Firestore Initialization and Authentication ---

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
                setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                setIsAuthReady(true);
            });

            return () => unsubscribeAuth();

        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setError("Could not initialize database. Check console for details.");
        }
    }, []);

    // --- Data Listener (Payments Collection) ---

    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        // Private data path: /artifacts/{appId}/users/{userId}/payments
        const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
        const q = query(paymentsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPayments = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Ensure date is in YYYY-MM-DD format for input consistency
                    dueDate: data.dueDate ? new Date(data.dueDate).toISOString().substring(0, 10) : ''
                };
            });
            setPayments(fetchedPayments);
        }, (err) => {
            console.error("Firestore subscription failed:", err);
            setError("Failed to load payment data. Check network connection.");
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady]);

    // --- CRUD Operations ---

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setForm({ name: '', amount: '', dueDate: '', status: 'Upcoming' });
        setEditingPayment(null);
        setIsAdding(false);
    };

    const handleSavePayment = async (e) => {
        e.preventDefault();
        if (!db || !userId) return;

        const { name, amount, dueDate } = form;
        if (!name.trim() || !amount.trim() || !dueDate.trim() || isNaN(parseFloat(amount))) {
            setError("Please fill out all fields correctly (Amount must be a number).");
            return;
        }
        setError(null);

        const paymentData = {
            name: name.trim(),
            amount: parseFloat(amount).toFixed(2),
            dueDate: dueDate, // Stored as YYYY-MM-DD string
            status: form.status,
            updatedAt: serverTimestamp()
        };

        try {
            const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
            if (editingPayment) {
                await updateDoc(doc(paymentsRef, editingPayment.id), paymentData);
            } else {
                await addDoc(paymentsRef, { ...paymentData, createdAt: serverTimestamp() });
            }
            resetForm();
        } catch (e) {
            console.error("Error saving payment:", e);
            setError(`Failed to save payment: ${e.message}`);
        }
    };

    const handleEdit = (payment) => {
        setEditingPayment(payment);
        setForm({
            name: payment.name,
            amount: payment.amount,
            dueDate: payment.dueDate,
            status: payment.status
        });
        setIsAdding(true);
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
        const newStatus = payment.status === 'Paid' ? 'Upcoming' : 'Paid';
        try {
            const paymentsRef = collection(db, 'artifacts', appId, 'users', userId, 'payments');
            await updateDoc(doc(paymentsRef, payment.id), { status: newStatus, updatedAt: serverTimestamp() });
        } catch (e) {
            console.error("Error updating status:", e);
            setError(`Failed to update status: ${e.message}`);
        }
    };

    // --- Computed Data ---
    const sortedPayments = useMemo(() => {
        return [...payments]
            .map(p => ({
                ...p,
                daysUntilDue: p.status === 'Paid' ? Infinity : getDaysUntilDue(p.dueDate)
            }))
            .sort((a, b) => {
                // Paid items always go last
                if (a.status === 'Paid' && b.status !== 'Paid') return 1;
                if (a.status !== 'Paid' && b.status === 'Paid') return -1;
                if (a.status === 'Paid' && b.status === 'Paid') return 0;
                
                // Sort by days until due (closest first)
                return a.daysUntilDue - b.daysUntilDue;
            });
    }, [payments]);

    const overdueCount = sortedPayments.filter(p => p.daysUntilDue < 0 && p.status !== 'Paid').length;
    
    // --- Components & Render ---

    const PaymentForm = () => (
        <form onSubmit={handleSavePayment} className="space-y-4 p-6 bg-gray-800 rounded-lg shadow-lg border border-indigo-700">
            <h3 className="text-xl font-semibold text-indigo-400">{editingPayment ? 'Edit Payment' : 'Add New Payment'}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="col-span-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Payment Name</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-400" />
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            value={form.name} 
                            onChange={handleFormChange}
                            placeholder="e.g., Rent, Credit Card, Electricity"
                            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {/* Amount */}
                <div className="col-span-1">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">Amount ($)</label>
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
                            required
                        />
                    </div>
                </div>

                {/* Due Date */}
                <div className="col-span-1">
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
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
                    <XCircle className="w-5 h-5 mr-2" /> Cancel
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

    const PaymentItem = ({ payment }) => {
        const { border, bg, text, icon: Icon } = getUrgencyClasses(payment);
        const daysUntilDue = getDaysUntilDue(payment.dueDate);
        
        const DueInfo = () => {
            if (payment.status === 'Paid') {
                return <span className="text-green-400 font-bold flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> PAID</span>;
            } else if (daysUntilDue < 0) {
                return <span className="text-red-400 font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> OVERDUE ({Math.abs(daysUntilDue)}d)</span>;
            } else if (daysUntilDue === 0) {
                return <span className="text-yellow-400 font-bold flex items-center"><Clock className="w-4 h-4 mr-1" /> DUE TODAY</span>;
            } else if (daysUntilDue === 1) {
                return <span className="text-yellow-400 font-bold flex items-center"><Clock className="w-4 h-4 mr-1" /> DUE TOMORROW</span>;
            } else {
                return <span className="text-blue-400 font-bold">{daysUntilDue} days left</span>;
            }
        };
    
        return (
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl shadow-md transition-all ${bg} ${border} border-l-4`}>
                <div className="flex-grow space-y-1 mb-3 sm:mb-0">
                    <div className="flex items-center">
                        <Icon className={`w-5 h-5 mr-3 ${text}`} />
                        <h4 className="text-lg font-bold text-white">{payment.name}</h4>
                    </div>
                    <p className="text-2xl font-extrabold text-indigo-300 ml-8">${payment.amount}</p>
                    <div className="flex space-x-4 text-sm text-gray-400 ml-8">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>Due: {payment.dueDate}</span>
                        </div>
                        <DueInfo />
                    </div>
                </div>
                
                <div className="flex space-x-2">
                    {payment.status !== 'Paid' && (
                        <button 
                            onClick={() => handleTogglePaid(payment)}
                            className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition"
                            title="Mark as Paid"
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
        );
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
            
            <header className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-indigo-400">
                    A(I)VERSE: Arrears Alarm
                </h1>
                <p className="text-indigo-300 mt-2">
                    Your manual payment sentinel. Never pay a late fee again.
                </p>
                {userId && (
                    <p className="text-xs text-gray-500 mt-1">
                        User ID: {userId}
                    </p>
                )}
            </header>

            <main className="w-full max-w-4xl space-y-6">
                
                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-3" />
                        {error}
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

                {/* Add/Edit Form */}
                {isAdding && <PaymentForm />}

                {/* Main Content Card (List and Add Button) */}
                <div className="card p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold text-indigo-400">
                            Upcoming Payments ({sortedPayments.filter(p => p.status !== 'Paid').length})
                        </h2>
                        <button
                            onClick={() => {
                                setIsAdding(prev => !prev);
                                if (isAdding) resetForm(); // If closing, reset form
                            }}
                            className={`flex items-center px-4 py-2 font-medium rounded-lg transition ${
                                isAdding ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/50'
                            }`}
                        >
                            {isAdding ? (
                                <><XCircle className="w-5 h-5 mr-2" /> Close Form</>
                            ) : (
                                <><PlusCircle className="w-5 h-5 mr-2" /> Add New Payment</>
                            )}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {sortedPayments.length === 0 ? (
                            <p className="text-gray-500 italic p-4 text-center">No payments scheduled yet. Click "Add New Payment" to get started!</p>
                        ) : (
                            sortedPayments.map(payment => (
                                <PaymentItem key={payment.id} payment={payment} />
                            ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}