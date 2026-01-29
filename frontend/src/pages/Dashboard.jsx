import { Link } from 'react-router-dom';
import { Play, Calendar, Zap, TrendingDown, Tag, Clock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../api/client';
import ActivityCalendar from '../components/ActivityCalendar';

export default function Dashboard() {
    const [todayReviews, setTodayReviews] = useState([]);
    const [upcomingReviews, setUpcomingReviews] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [failureStreaks, setFailureStreaks] = useState(null);
    const [completionStreak, setCompletionStreak] = useState(0);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    todayRes,
                    upcomingRes,
                    profileRes,
                    analyticsRes,
                    streakRes,
                    failureRes
                ] = await Promise.all([
                    api.get('/reviews/today'),
                    api.get('/reviews/upcoming'),
                    api.get('/profile/'),
                    api.get('/analytics/summary'),
                    api.get('/analytics/completion-streak'),
                    api.get('/analytics/failure-streaks')
                ]);

                setTodayReviews(todayRes.data);
                setUpcomingReviews(upcomingRes.data);
                setAnalytics(analyticsRes.data);
                setCompletionStreak(streakRes.data.current_streak || 0);
                setFailureStreaks(failureRes.data);

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

    // Find next upcoming review date
    const nextReviewDate = upcomingReviews.length > 0
        ? new Date(upcomingReviews[0].scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : null;

    // Generate insight message
    const getInsightMessage = () => {
        if (!analytics || !analytics.has_data) return null;

        if (analytics.overconfidence_rate >= 50) {
            return "You often fail after high confidence. Consider more cautious self-assessment.";
        }
        if (analytics.most_common_interval) {
            return `You fail most often at the ${analytics.most_common_interval} review.`;
        }
        if (analytics.most_problematic_tag) {
            return `${analytics.most_problematic_tag} appears frequently in failed reviews.`;
        }
        return null;
    };

    const insightMessage = getInsightMessage();

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">
                        {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Streak Badge */}
                {completionStreak > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium">
                        <Zap size={16} />
                        {completionStreak} day streak
                    </div>
                )}
            </div>

            {/* Today's Focus - Primary Section */}
            <div className="glass rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 text-primary text-sm font-medium mb-4">
                    <Calendar size={16} />
                    Today's Focus
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : todayReviews.length > 0 ? (
                    <>
                        <div className="space-y-3 mb-6">
                            {todayReviews.slice(0, 5).map((review) => (
                                <div
                                    key={review.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate">{review.problem?.title || `Problem #${review.problem_id}`}</h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
                                                {review.interval_label}
                                            </span>
                                            {review.problem?.tags?.slice(0, 2).map(tag => (
                                                <span key={tag} className="truncate">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <Clock size={16} className="text-muted-foreground flex-shrink-0 ml-2" />
                                </div>
                            ))}
                            {todayReviews.length > 5 && (
                                <p className="text-sm text-muted-foreground text-center">
                                    +{todayReviews.length - 5} more reviews
                                </p>
                            )}
                        </div>

                        <Link
                            to="/reviews"
                            className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <Play size={16} fill="currentColor" />
                            Start Today's Review
                            <ArrowRight size={16} />
                        </Link>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
                        <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                        <p className="text-muted-foreground text-sm">
                            {nextReviewDate
                                ? `Next review on ${nextReviewDate}`
                                : 'Add problems to start building your schedule'}
                        </p>
                        {!nextReviewDate && (
                            <Link to="/problems" className="btn-secondary inline-flex items-center gap-2 mt-4">
                                Add Problems
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Learning Signals - Compact Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Completion Streak */}
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Zap size={16} />
                        <span className="text-xs font-medium uppercase tracking-wide">Streak</span>
                    </div>
                    <div className="text-2xl font-bold">{completionStreak}</div>
                    <div className="text-xs text-muted-foreground">days</div>
                </div>

                {/* Total Failures */}
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-rose-400 mb-2">
                        <TrendingDown size={16} />
                        <span className="text-xs font-medium uppercase tracking-wide">Failures</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics?.total_failures || 0}</div>
                    <div className="text-xs text-muted-foreground">total</div>
                </div>

                {/* Weak Interval */}
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-medium uppercase tracking-wide">Weak At</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics?.most_common_interval || '—'}</div>
                    <div className="text-xs text-muted-foreground">interval</div>
                </div>

                {/* Weak Tag */}
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <Tag size={16} />
                        <span className="text-xs font-medium uppercase tracking-wide">Weak Tag</span>
                    </div>
                    <div className="text-lg font-bold truncate">{analytics?.most_problematic_tag || '—'}</div>
                    <div className="text-xs text-muted-foreground">topic</div>
                </div>
            </div>

            {/* Quick Insight */}
            {insightMessage && (
                <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-amber-400/50">
                    <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{insightMessage}</p>
                </div>
            )}

            {/* Failure Streak Warning */}
            {failureStreaks?.current_streak >= 2 && (
                <div className="glass rounded-xl p-4 flex items-start gap-3 border-l-2 border-rose-400/50">
                    <TrendingDown size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                        {failureStreaks.current_streak} consecutive days with failures. Consider taking a break or reducing load.
                    </p>
                </div>
            )}

            {/* Activity Calendar */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Attempts over the last year
                </h2>
                <ActivityCalendar />
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
                <Link
                    to="/problems"
                    className="glass rounded-xl p-5 hover:bg-white/10 transition-colors group"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium mb-1">Problem Bank</h3>
                            <p className="text-sm text-muted-foreground">Browse and filter your problems</p>
                        </div>
                        <ArrowRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                </Link>

                <Link
                    to="/insights"
                    className="glass rounded-xl p-5 hover:bg-white/10 transition-colors group"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium mb-1">Insights</h3>
                            <p className="text-sm text-muted-foreground">Deep dive into your patterns</p>
                        </div>
                        <ArrowRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
