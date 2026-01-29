import { useState, useEffect } from 'react';
import api from '../api/client';
import {
    BarChart3,
    Clock,
    AlertTriangle,
    TrendingUp,
    Calendar,
    ChevronRight,
    Loader2,
    Brain,
    Target,
    Flame
} from 'lucide-react';

export default function Insights() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [failureLog, setFailureLog] = useState([]);
    const [intervalData, setIntervalData] = useState({});
    const [tagData, setTagData] = useState([]);
    const [confidenceData, setConfidenceData] = useState({});
    const [timeData, setTimeData] = useState([]);
    const [streakData, setStreakData] = useState({});

    useEffect(() => {
        fetchAllAnalytics();
    }, []);

    const fetchAllAnalytics = async () => {
        try {
            const [
                summaryRes,
                logRes,
                intervalRes,
                tagRes,
                confRes,
                timeRes,
                streakRes
            ] = await Promise.all([
                api.get('/analytics/summary'),
                api.get('/analytics/failure-log?limit=5'),
                api.get('/analytics/failure-by-interval'),
                api.get('/analytics/failure-by-tag'),
                api.get('/analytics/confidence-outcome'),
                api.get('/analytics/time-of-day'),
                api.get('/analytics/failure-streaks')
            ]);

            setSummary(summaryRes.data);
            setFailureLog(logRes.data);
            setIntervalData(intervalRes.data);
            setTagData(tagRes.data);
            setConfidenceData(confRes.data);
            setTimeData(timeRes.data);
            setStreakData(streakRes.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    if (!summary?.has_data) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text">Insights</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Learning failure analysis
                    </p>
                </div>

                <div className="glass rounded-xl md:rounded-2xl p-8 md:p-12 text-center">
                    <Brain size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">No Failure Data Yet</h3>
                    <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                        When you miss scheduled reviews, you'll record reflections here.
                        These insights help you understand how learning fails.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Insights</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Understanding how learning fails
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard
                    icon={<AlertTriangle size={20} />}
                    label="Total Failures"
                    value={summary.total_failures}
                    color="rose"
                />
                <SummaryCard
                    icon={<Clock size={20} />}
                    label="Common Interval"
                    value={summary.most_common_interval || '—'}
                    color="amber"
                />
                <SummaryCard
                    icon={<Target size={20} />}
                    label="Problem Area"
                    value={summary.most_problematic_tag || '—'}
                    color="blue"
                />
                <SummaryCard
                    icon={<TrendingUp size={20} />}
                    label="Overconfidence"
                    value={`${summary.overconfidence_rate}%`}
                    color="purple"
                />
            </div>

            {/* Failure Log */}
            <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Calendar size={20} className="text-rose-400" />
                        Recent Failures
                    </h2>
                </div>

                {failureLog.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No failures recorded yet.</p>
                ) : (
                    <div className="space-y-3">
                        {failureLog.map((item, idx) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate">{item.problem_title}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-xs bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded">
                                                {item.interval_label} failed
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {item.failure_date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    "{item.reflection_snippet}"
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interval Distribution */}
                <div className="glass rounded-xl p-4 md:p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-amber-400" />
                        Failures by Interval
                    </h2>
                    <div className="space-y-3">
                        {['1d', '7d', '30d', '90d'].map(interval => {
                            const data = intervalData[interval] || { count: 0, percentage: 0 };
                            return (
                                <div key={interval} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span>{interval}</span>
                                        <span className="text-muted-foreground">
                                            {data.count} ({data.percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: `${data.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        High 1d = recall issues • High 30d/90d = retention issues
                    </p>
                </div>

                {/* Tag Analysis */}
                <div className="glass rounded-xl p-4 md:p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Target size={20} className="text-blue-400" />
                        Failures by Tag
                    </h2>
                    {tagData.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No tag data available.</p>
                    ) : (
                        <div className="space-y-3">
                            {tagData.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="truncate">{item.tag}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} ({item.percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Overconfidence Alert */}
            {confidenceData.high_confidence_failures > 0 && (
                <div className="glass rounded-xl p-4 md:p-6 border-l-4 border-purple-500">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-purple-400" />
                        Overconfidence Pattern
                    </h2>
                    <p className="text-muted-foreground text-sm mb-3">
                        {confidenceData.high_confidence_failures} problems failed after high confidence (score 4-5).
                    </p>
                    <p className="text-sm">
                        {confidenceData.insight}
                    </p>
                </div>
            )}

            {/* Streak Warning */}
            {streakData.current_streak >= 2 && (
                <div className="glass rounded-xl p-4 md:p-6 border-l-4 border-amber-500">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Flame size={20} className="text-amber-400" />
                        Failure Streak: {streakData.current_streak} days
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {streakData.insight}
                    </p>
                </div>
            )}

            {/* Time of Day */}
            {timeData.length > 0 && (
                <div className="glass rounded-xl p-4 md:p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-emerald-400" />
                        Failure Times
                    </h2>
                    <div className="flex items-end gap-1 h-24">
                        {Array.from({ length: 24 }, (_, hour) => {
                            const data = timeData.find(t => t.hour === hour);
                            const count = data?.count || 0;
                            const maxCount = Math.max(...timeData.map(t => t.count), 1);
                            const height = (count / maxCount) * 100;
                            return (
                                <div
                                    key={hour}
                                    className="flex-1 bg-emerald-500/50 rounded-t transition-all duration-300 hover:bg-emerald-500"
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                    title={`${hour}:00 - ${count} failures`}
                                />
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>12am</span>
                        <span>6am</span>
                        <span>12pm</span>
                        <span>6pm</span>
                        <span>11pm</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ icon, label, value, color }) {
    const colorClasses = {
        rose: 'text-rose-400 bg-rose-500/10',
        amber: 'text-amber-400 bg-amber-500/10',
        blue: 'text-blue-400 bg-blue-500/10',
        purple: 'text-purple-400 bg-purple-500/10',
        emerald: 'text-emerald-400 bg-emerald-500/10'
    };

    return (
        <div className="glass rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
                {icon}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}
