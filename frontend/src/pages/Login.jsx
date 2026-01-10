import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });

        if (error) {
            setMessage('Error: ' + error.message);
            setSuccess(false);
        } else {
            setMessage('Magic link sent! Check your inbox.');
            setSuccess(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 gradient-glow" />
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

            {/* Floating Elements */}
            <div className="absolute top-20 left-20 animate-float opacity-20">
                <Sparkles size={40} className="text-primary" />
            </div>
            <div className="absolute bottom-32 right-32 animate-float opacity-20" style={{ animationDelay: '1s' }}>
                <Sparkles size={32} className="text-secondary" />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">ReSolve</h1>
                    <p className="text-muted-foreground">Master your coding problems with spaced repetition</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-muted-foreground">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-modern pl-12"
                                placeholder="you@example.com"
                                disabled={loading || success}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Sending...
                            </>
                        ) : success ? (
                            <>
                                <Mail size={20} />
                                Check Your Email
                            </>
                        ) : (
                            <>
                                Send Magic Link
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm text-center animate-in fade-in slide-in-from-bottom-2 ${success
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                            {message}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-xs text-muted-foreground">
                        No password required. We'll send you a magic link.
                    </p>
                </div>
            </div>
        </div>
    );
}
