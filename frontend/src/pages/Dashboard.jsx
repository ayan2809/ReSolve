import { Link } from 'react-router-dom';
import { Play, Target, TrendingUp, Calendar, Zap, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client';
import ActivityCalendar from '../components/ActivityCalendar';

export default function Dashboard() {
    const [pendingCount, setPendingCount] = useState(0);
    const [totalProblems, setTotalProblems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('Engineer');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [reviewsRes, problemsRes, profileRes] = await Promise.all([
                    api.get('/reviews/today'),
                    api.get('/problems'),
                    api.get('/profile/')
                ]);
                setPendingCount(reviewsRes.data.length);
                setTotalProblems(problemsRes.data.length);

                // Set display name from profile
                const profile = profileRes.data;
                if (profile.display_name) {
                    setDisplayName(profile.display_name);
                } else if (profile.username) {
                    setDisplayName(profile.username);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = [
        { label: 'Problems Tracked', value: totalProblems, icon: Target, color: 'text-blue-400' },
        { label: 'Due Today', value: pendingCount, icon: Calendar, color: 'text-amber-400' },
        { label: 'Streak', value: '–', icon: Zap, color: 'text-emerald-400' },
    ];

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden glass rounded-2xl md:rounded-3xl p-6 md:p-8">
                <div className="absolute top-0 right-0 w-48 md:w-80 h-48 md:h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 md:w-64 h-32 md:h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-primary text-sm font-medium mb-3 md:mb-4">
                        <Trophy size={16} />
                        <span>Welcome back, {displayName}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">
                        <span className="gradient-text">Master Your</span>
                        <br />
                        <span className="text-foreground">Coding Problems</span>
                    </h1>
                    <p className="text-muted-foreground text-base md:text-lg max-w-md">
                        Mastery is a process, not a destination.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className="glass rounded-xl md:rounded-2xl p-4 md:p-6 group hover:bg-white/10 transition-all duration-300"
                    >
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <stat.icon size={20} className={`${stat.color} md:w-6 md:h-6`} />
                        </div>
                        <div className="text-2xl md:text-3xl font-bold mb-0.5 md:mb-1">
                            {loading ? (
                                <div className="w-8 md:w-12 h-6 md:h-8 bg-white/10 rounded animate-pulse" />
                            ) : (
                                stat.value
                            )}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground truncate">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Action Cards */}
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                {/* Today's Focus Card */}
                <div className="card-interactive p-6 md:p-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                    <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-primary/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                            <Calendar size={16} />
                            Today's Focus
                        </div>
                        <div className="flex items-end gap-2 md:gap-3 mb-4 md:mb-6">
                            <span className="text-5xl md:text-6xl font-bold text-primary">
                                {loading ? '–' : pendingCount}
                            </span>
                            <span className="text-muted-foreground pb-1 md:pb-2 text-sm md:text-base">to review</span>
                        </div>

                        {pendingCount > 0 ? (
                            <Link
                                to="/reviews"
                                className="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-4 md:px-6 py-2.5 md:py-3"
                            >
                                <Play size={16} fill="currentColor" />
                                Start Session
                            </Link>
                        ) : (
                            <div className="inline-flex items-center gap-2 text-emerald-400 text-sm">
                                <Trophy size={16} />
                                All caught up!
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Add Card */}
                <div className="card-interactive p-6 md:p-8 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-32 md:w-40 h-32 md:h-40 bg-secondary/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2 group-hover:scale-150 transition-transform duration-500" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-secondary text-sm font-medium mb-2">
                            <Target size={16} />
                            Problem Bank
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-2">Track Problems</h3>
                        <p className="text-muted-foreground text-sm md:text-base mb-4 md:mb-6">
                            Add problems to build your review schedule.
                        </p>

                        <Link
                            to="/problems"
                            className="btn-secondary inline-flex items-center gap-2 text-sm md:text-base px-4 md:px-6 py-2.5 md:py-3"
                        >
                            View Problems
                        </Link>
                    </div>
                </div>
            </div>

            {/* Activity Calendar */}
            <ActivityCalendar />

            {/* Tip Section */}
            <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 flex items-start gap-3 md:gap-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                    <Zap size={18} className="text-white" />
                </div>
                <div>
                    <h4 className="font-medium mb-1 text-sm md:text-base">Pro Tip</h4>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        Consistency beats intensity. Review a few problems daily.
                    </p>
                </div>
            </div>
        </div>
    );
}
