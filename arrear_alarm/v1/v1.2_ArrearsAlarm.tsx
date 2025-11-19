// Arrears Alarm v1.2 - Stable Version
// Save this as: ArrearsAlarm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Trash2, Edit3, Save, XCircle, Clock, AlertTriangle, CheckCircle, Repeat, Calendar, List, FileText, Tag, Bell, TrendingUp, DollarSign } from 'lucide-react';

const TAG_COLOR_MAP = {
    'Rent': { bg: 'bg-blue-600/50', text: 'text-blue-200' },
    'Insurance': { bg: 'bg-green-600/50', text: 'text-green-200' },
    'Mortgage': { bg: 'bg-purple-600/50', text: 'text-purple-200' },
    'Credit Card': { bg: 'bg-red-600/50', text: 'text-red-200' },
    'Health Care': { bg: 'bg-pink-600/50', text: 'text-pink-200' },
    'Auto': { bg: 'bg-yellow-600/50', text: 'text-yellow-200' },
    'Utilities': { bg: 'bg-cyan-600/50', text: 'text-cyan-200' },
    'Other': { bg: 'bg-gray-600/50', text: 'text-gray-200' },
};

const BASE_TAGS = Object.keys(TAG_COLOR_MAP);

const REMINDER_OPTIONS = [
    { value: 'default', label: 'Default: 1 Day Before + Due Day', daysBefore: 1 },
    { value: 'week', label: '1 Week Before + Due Day', daysBefore: 7 },
    { value: '3days', label: '3 Days Before + Due Day', daysBefore: 3 },
    { value: 'dueonly', label: 'Due Day Only', daysBefore: 0 },
    { value: 'off', label: 'No Reminders', daysBefore: null },
];

export default function App() {
    const [payments, setPayments] = useState([]);
    const [customTags, setCustomTags] = useState([]);
    const [displayName, setDisplayName] = useState('My Wallet');
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [editingPayment, setEditingPayment] = useState(null);
    const [error, setError] = useState(null);
    const [showCustomTagInput, setShowCustomTagInput] = useState(false);
    const [newCustomTag, setNewCustomTag] = useState('');
    const [form, setForm] = useState({
        name: '',
        amount: '',
        dueDate: '',
        status: 'Upcoming',
        isRecurring: false,
        categoryTag: BASE_TAGS[0],
        reminderCadence: 'default',
    });

    const allTags = useMemo(() => [...BASE_TAGS, ...customTags], [customTags]);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const loadData = async () => {
            try {
                const pd = await window.storage.get('payments', false);
                if (pd) setPayments(JSON.parse(pd.value));
                
                const td = await window.storage.get('customTags', false);
                if (td) setCustomTags(JSON.parse(td.value));

                const profile = await window.storage.get('profile', false);
                if (profile) setDisplayName(JSON.parse(profile.value).displayName || 'My Wallet');
            } catch (e) {
                console.log('Starting fresh');
            }
        };
        loadData();
    }, []);

    const savePayments = async (newPayments) => {
        try {
            await window.storage.set('payments', JSON.stringify(newPayments), false);
            setPayments(newPayments);
        } catch (e) {
            setError('Save failed');
        }
    };

    const saveCustomTags = async (tags) => {
        try {
            await window.storage.set('customTags', JSON.stringify(tags), false);
            setCustomTags(tags);
        } catch (e) {
            setError('Failed to save custom tag');
        }
    };

    const getDaysUntilDue = (dueDate) => {
        if (!dueDate) return 9999;
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        return Math.ceil((due - todayDate) / (1000 * 60 * 60 * 24));
    };

    const subtractDaysFromDate = (dateStr, days) => {
        const date = new Date(dateStr);
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    };

    const getReminderDates = (dueDate, reminderCadence) => {
        if (reminderCadence === 'off') return [];
        
        const option = REMINDER_OPTIONS.find(opt => opt.value === reminderCadence);
        if (!option || option.daysBefore === null) return [];

        const reminders = [];
        
        if (option.daysBefore > 0) {
            reminders.push({
                label: `Reminder 1 (${option.daysBefore} day${option.daysBefore > 1 ? 's' : ''} before)`,
                date: subtractDaysFromDate(dueDate, option.daysBefore),
                type: 'advance'
            });
        }
        
        if (reminderCadence !== 'dueonly' || option.daysBefore === 0) {
            reminders.push({
                label: 'Reminder (Due Date)',
                date: dueDate,
                type: 'due'
            });
        }
        
        return reminders;
    };

    const getNextRecurringDate = (currentDate) => {
        const current = new Date(currentDate);
        const dayOfMonth = current.getDate();
        
        let next = new Date(current);
        next.setMonth(next.getMonth() + 1);
        
        const lastDayOfNextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        if (dayOfMonth > lastDayOfNextMonth) {
            next.setDate(lastDayOfNextMonth);
        } else {
            next.setDate(dayOfMonth);
        }
        
        return next.toISOString().split('T')[0];
    };

    const nextRecurringDate = form.isRecurring && form.dueDate ? getNextRecurringDate(form.dueDate) : null;

    const handleAddCustomTag = async () => {
        if (!newCustomTag.trim()) return;
        const trimmed = newCustomTag.trim();
        if (allTags.includes(trimmed)) {
            setError('Tag already exists');
            return;
        }
        const updated = [...customTags, trimmed];
        await saveCustomTags(updated);
        setForm(prev => ({ ...prev, categoryTag: trimmed }));
        setNewCustomTag('');
        setShowCustomTagInput(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Payment name is required');
            return;
        }
        if (!form.dueDate) {
            setError('Due date is required');
            return;
        }

        setError(null);

        const paymentData = {
            id: editingPayment ? editingPayment.id : Date.now().toString(),
            name: form.name.trim(),
            amount: form.amount || null,
            dueDate: form.dueDate,
            status: form.status,
            isRecurring: form.isRecurring,
            categoryTag: form.categoryTag,
            reminderCadence: form.reminderCadence,
            updatedAt: new Date().toISOString(),
        };

        let newPayments = editingPayment
            ? payments.map(p => (p.id === editingPayment.id ? paymentData : p))
            : [...payments, paymentData];

        await savePayments(newPayments);
        setForm({
            name: '',
            amount: '',
            dueDate: '',
            status: 'Upcoming',
            isRecurring: false,
            categoryTag: BASE_TAGS[0],
            reminderCadence: 'default',
        });
        setEditingPayment(null);
        setActiveTab('Upcoming');
    };

    const handleEdit = (payment) => {
        setEditingPayment(payment);
        setForm({
            name: payment.name,
            amount: payment.amount || '',
            dueDate: payment.dueDate,
            status: payment.status,
            isRecurring: payment.isRecurring || false,
            categoryTag: payment.categoryTag || BASE_TAGS[0],
            reminderCadence: payment.reminderCadence || 'default',
        });
        setActiveTab('New Payment');
    };

    const handleTogglePaid = async (payment) => {
        // Guard rail: Check if recurring payment is more than 30 days away
        if (payment.isRecurring && payment.status !== 'Paid') {
            const daysUntil = getDaysUntilDue(payment.dueDate);
            if (daysUntil > 30) {
                setError(`Cannot mark as paid: This payment is ${daysUntil} days away. You can only mark recurring payments as paid within 30 days of the due date.`);
                return;
            }
        }

        let updated = { ...payment };
        if (payment.status === 'Paid') {
            updated.status = 'Upcoming';
        } else {
            updated.status = 'Paid';
            updated.updatedAt = new Date().toISOString();
            if (payment.isRecurring) {
                updated.dueDate = getNextRecurringDate(payment.dueDate);
                updated.status = 'Upcoming';
            }
        }
        await savePayments(payments.map(p => (p.id === payment.id ? updated : p)));
    };

    const handleDelete = async (id) => {
        await savePayments(payments.filter(p => p.id !== id));
    };

    const sorted = useMemo(() => {
        return [...payments]
            .map(p => ({ ...p, daysUntil: getDaysUntilDue(p.dueDate) }))
            .sort((a, b) => {
                if (a.status === 'Paid' && b.status !== 'Paid') return 1;
                if (a.status !== 'Paid' && b.status === 'Paid') return -1;
                return a.daysUntil - b.daysUntil;
            });
    }, [payments]);

    const upcoming = sorted.filter(p => p.status !== 'Paid');
    const history = sorted.filter(p => p.status === 'Paid');
    const overdueCount = upcoming.filter(p => p.daysUntil < 0).length;

    // Weekly analytics
    const weeklyAnalytics = useMemo(() => {
        const next7Days = upcoming.filter(p => p.daysUntil >= 0 && p.daysUntil <= 7);
        const totalAmount = next7Days.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        return {
            count: next7Days.length,
            totalAmount: totalAmount,
            payments: next7Days
        };
    }, [upcoming]);

    // Group payments by date
    const groupedByDate = useMemo(() => {
        const groups = {};
        upcoming.forEach(payment => {
            const date = payment.dueDate;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(payment);
        });
        return groups;
    }, [upcoming]);

    const getCategoryColor = (tag) => TAG_COLOR_MAP[tag] || { bg: 'bg-orange-600/50', text: 'text-orange-200' };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-900 text-white">
            <style>{`
                body { 
                    font-family: Inter, sans-serif; 
                    background: radial-gradient(circle at 10% 20%, #1a1a2e 0%, #16213e 50%); 
                    min-height: 100vh;
                }
            `}</style>

            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 to-indigo-400 bg-clip-text text-transparent">
                    A(I)VERSE: Arrears Alarm
                </h1>
                <p className="text-center text-indigo-300 mb-1">{displayName}'s Wallet</p>
                <p className="text-center text-gray-400 text-sm mb-8">v1.2 - Smart Payment Tracking</p>

                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-4 flex justify-between items-center">
                        <div className="flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            <span>{error}</span>
                        </div>
                        <button onClick={() => setError(null)}>
                            <XCircle className="w-5 h-5 hover:text-red-300" />
                        </button>
                    </div>
                )}

                {overdueCount > 0 && (
                    <div className="p-4 bg-red-800/50 border border-red-600 rounded-xl mb-4 animate-pulse">
                        <AlertTriangle className="inline w-6 h-6 mr-2" />
                        <span className="text-xl font-bold">{overdueCount} Payment(s) OVERDUE!</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('Upcoming')}
                        className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition ${
                            activeTab === 'Upcoming' ? 'bg-indigo-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <List className="w-5 h-5 mr-2" />
                        Upcoming ({upcoming.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('History')}
                        className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition ${
                            activeTab === 'History' ? 'bg-indigo-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <FileText className="w-5 h-5 mr-2" />
                        History ({history.length})
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('New Payment');
                            setEditingPayment(null);
                            setForm({
                                name: '',
                                amount: '',
                                dueDate: '',
                                status: 'Upcoming',
                                isRecurring: false,
                                categoryTag: BASE_TAGS[0],
                                reminderCadence: 'default',
                            });
                        }}
                        className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition ${
                            activeTab === 'New Payment' ? 'bg-indigo-600 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <PlusCircle className="w-5 h-5 mr-2" />
                        New Payment
                    </button>
                </div>

                {activeTab === 'New Payment' && (
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                        <h3 className="text-xl font-semibold text-indigo-400">
                            {editingPayment ? 'Edit Payment' : 'Add New Payment'}
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Payment Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Rent, Credit Card Bill"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Amount (Optional)
                            </label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="Enter amount in dollars"
                                step="0.01"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="flex items-center space-x-2 mb-3">
                                <input
                                    type="checkbox"
                                    checked={form.isRecurring}
                                    onChange={e => setForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-300 flex items-center">
                                    <Repeat className="w-4 h-4 mr-1" />
                                    Recurring Payment (Monthly)
                                </span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                {form.isRecurring ? 'First Due Date' : 'Due Date'} <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                    min={today}
                                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            {form.isRecurring && nextRecurringDate && (
                                <p className="text-sm text-indigo-300 mt-2 flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    Next payment due: {nextRecurringDate}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Category Tag
                            </label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select
                                    value={form.categoryTag}
                                    onChange={e => {
                                        if (e.target.value === '__add_custom__') {
                                            setShowCustomTagInput(true);
                                        } else {
                                            setForm(prev => ({ ...prev, categoryTag: e.target.value }));
                                        }
                                    }}
                                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {allTags.map(tag => (
                                        <option key={tag} value={tag}>
                                            {tag}
                                        </option>
                                    ))}
                                    <option value="__add_custom__">+ Add Custom Tag</option>
                                </select>
                            </div>
                            {showCustomTagInput && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={newCustomTag}
                                        onChange={e => setNewCustomTag(e.target.value)}
                                        placeholder="Enter custom tag name"
                                        className="flex-1 px-3 py-2 bg-gray-700 border border-indigo-500 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddCustomTag();
                                        }}
                                    />
                                    <button
                                        onClick={handleAddCustomTag}
                                        className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCustomTagInput(false);
                                            setNewCustomTag('');
                                        }}
                                        className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Reminder Cadence
                            </label>
                            <div className="relative">
                                <Bell className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select
                                    value={form.reminderCadence}
                                    onChange={e => setForm(prev => ({ ...prev, reminderCadence: e.target.value }))}
                                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {REMINDER_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setForm({
                                        name: '',
                                        amount: '',
                                        dueDate: '',
                                        status: 'Upcoming',
                                        isRecurring: false,
                                        categoryTag: BASE_TAGS[0],
                                        reminderCadence: 'default',
                                    });
                                    setEditingPayment(null);
                                    setShowCustomTagInput(false);
                                }}
                                className="flex-1 px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition font-medium"
                            >
                                <XCircle className="inline w-5 h-5 mr-2" />
                                Clear
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition font-medium shadow-lg"
                            >
                                <Save className="inline w-5 h-5 mr-2" />
                                {editingPayment ? 'Update' : 'Save'} Payment
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'Upcoming' && (
                    <div className="space-y-6">
                        {weeklyAnalytics.count > 0 && (
                            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-6 rounded-xl border border-indigo-700">
                                <h3 className="text-lg font-semibold text-indigo-300 mb-4 flex items-center">
                                    <TrendingUp className="w-5 h-5 mr-2" />
                                    Next 7 Days Overview
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-800/50 p-4 rounded-lg">
                                        <p className="text-gray-400 text-sm mb-1">Upcoming Payments</p>
                                        <p className="text-3xl font-bold text-white">{weeklyAnalytics.count}</p>
                                    </div>
                                    <div className="bg-gray-800/50 p-4 rounded-lg">
                                        <p className="text-gray-400 text-sm mb-1">Total Amount Due</p>
                                        <p className="text-3xl font-bold text-green-400 flex items-center">
                                            <DollarSign className="w-6 h-6" />
                                            {weeklyAnalytics.totalAmount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
                            <h2 className="text-2xl font-semibold text-indigo-400">Upcoming Payments</h2>
                            {upcoming.length === 0 ? (
                                <p className="text-gray-500 text-center py-8 italic">No upcoming payments. Add one to get started!</p>
                            ) : (
                                Object.keys(groupedByDate).sort().map(date => {
                                    const paymentsOnDate = groupedByDate[date];
                                    const dateTotal = paymentsOnDate.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                                    const daysUntil = getDaysUntilDue(date);
                                    
                                    return (
                                        <div key={date} className="space-y-3">
                                            <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                                    <div>
                                                        <p className="font-bold text-white">{date}</p>
                                                        <p className="text-sm text-gray-400">
                                                            {daysUntil < 0 ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue` :
                                                             daysUntil === 0 ? 'Due today' :
                                                             daysUntil === 1 ? 'Due tomorrow' :
                                                             `${daysUntil} days away`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">{paymentsOnDate.length} payment{paymentsOnDate.length !== 1 ? 's' : ''}</p>
                                                    {dateTotal > 0 && (
                                                        <p className="font-bold text-indigo-300">${dateTotal.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {paymentsOnDate.map(payment => {
                                                const days = payment.daysUntil;
                                                const isOverdue = days < 0;
                                                const isDueToday = days === 0;
                                                const isDueSoon = days > 0 && days <= 7;
                                                const { bg, text } = getCategoryColor(payment.categoryTag);
                                                const reminders = getReminderDates(payment.dueDate, payment.reminderCadence);

                                                return (
                                                    <div
                                                        key={payment.id}
                                                        className={`ml-4 p-4 rounded-xl border-l-4 ${
                                                            isOverdue
                                                                ? 'bg-red-900/30 border-red-500'
                                                                : isDueToday
                                                                ? 'bg-yellow-900/20 border-yellow-500'
                                                                : isDueSoon
                                                                ? 'bg-orange-900/20 border-orange-500'
                                                                : 'bg-gray-700 border-blue-500'
                                                        }`}
                                                    >
                                                