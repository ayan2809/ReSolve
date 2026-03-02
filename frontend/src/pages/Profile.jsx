import { useState, useEffect } from 'react';
import api from '../api/client';
import { resetPendingReviews } from '../api/client';
import { User, Save, Loader2, RotateCcw, AlertTriangle, X } from 'lucide-react';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Reset schedule state
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetMessage, setResetMessage] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        display_name: '',
        bio: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile/');
            setProfile(res.data);
            setFormData({
                username: res.data.username || '',
                display_name: res.data.display_name || '',
                bio: res.data.bio || ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const res = await api.put('/profile/', formData);
            setProfile(res.data);
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setResetting(true);
        try {
            const res = await resetPendingReviews();
            const count = res.data.cancelled_count;
            setResetMessage(`Done — ${count} pending review${count !== 1 ? 's' : ''} cancelled. Your problems and past data are untouched.`);
            setShowResetModal(false);
        } catch {
            setResetMessage('Failed to reset. Please try again.');
        } finally {
            setResetting(false);
            setTimeout(() => setResetMessage(''), 5000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Profile</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Manage your account details
                </p>
            </div>

            <form onSubmit={handleSubmit} className="glass rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-5">
                {/* Avatar Placeholder */}
                <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full gradient-primary flex items-center justify-center">
                        <User size={32} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{formData.display_name || formData.username || 'New User'}</h3>
                        <p className="text-sm text-muted-foreground">@{formData.username || 'username'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-muted-foreground mb-2">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="input-modern"
                            placeholder="johndoe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-muted-foreground mb-2">Display Name</label>
                        <input
                            type="text"
                            value={formData.display_name}
                            onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                            className="input-modern"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-muted-foreground mb-2">Bio</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        className="input-modern resize-none"
                        placeholder="Tell us about yourself..."
                    />
                </div>

                {message && (
                    <div className={`p-3 rounded-xl text-sm ${message.includes('success')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    {saving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </form>

            {/* Danger Zone */}
            <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 border border-rose-500/20">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-400 mb-1">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Cancel all upcoming reviews and start with a clean slate. Your problems, attempts, and past analytics will not be affected.
                </p>

                <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                >
                    <RotateCcw size={16} />
                    Start Fresh
                </button>

                {resetMessage && (
                    <p className={`mt-3 text-sm ${resetMessage.startsWith('Done') ? 'text-emerald-400' : 'text-rose-400'
                        }`}>{resetMessage}</p>
                )}
            </div>

            {/* Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-rose-500/30">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle size={20} className="text-rose-400" />
                                </div>
                                <h3 className="font-semibold text-lg">Reset Schedule?</h3>
                            </div>
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            This will cancel <strong className="text-foreground">all pending scheduled reviews</strong>. Your problems, past attempts, reflections, and analytics will not be deleted.
                        </p>
                        <p className="text-xs text-rose-400/80 bg-rose-500/10 rounded-lg px-3 py-2">
                            This action cannot be undone. You will need to manually restart reviews for each problem.
                        </p>

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowResetModal(false)}
                                disabled={resetting}
                                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={resetting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-60"
                            >
                                {resetting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Resetting...</>
                                ) : (
                                    <><RotateCcw size={16} /> Confirm Reset</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
