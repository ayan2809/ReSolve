import { useState, useEffect } from 'react';
import api from '../api/client';
import { User, Save, Loader2 } from 'lucide-react';

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

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
        </div>
    );
}
