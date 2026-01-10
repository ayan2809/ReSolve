import { useEffect, useState } from 'react';
import api from '../api/client';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityCalendar() {
    const [activity, setActivity] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/stats/activity')
            .then(res => setActivity(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Generate calendar data - fewer weeks on mobile
    const generateCalendarData = (weeksCount = 53) => {
        const weeks = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - ((weeksCount - 1) * 7));
        startDate.setDate(startDate.getDate() - startDate.getDay());

        let currentDate = new Date(startDate);

        for (let w = 0; w < weeksCount; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const count = activity[dateStr] || 0;
                const isToday = currentDate.toDateString() === today.toDateString();
                const isFuture = currentDate > today;

                week.push({
                    date: dateStr,
                    count,
                    isToday,
                    isFuture,
                    month: currentDate.getMonth(),
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(week);
        }
        return weeks;
    };

    const getIntensity = (count) => {
        if (count === 0) return 0;
        if (count === 1) return 1;
        if (count <= 2) return 2;
        if (count <= 4) return 3;
        return 4;
    };

    const intensityClasses = [
        'bg-white/5',
        'bg-emerald-900/60',
        'bg-emerald-700/70',
        'bg-emerald-500/80',
        'bg-emerald-400',
    ];

    const totalAttempts = Object.values(activity).reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 flex items-center justify-center h-32 md:h-48">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-lg">Activity</h3>
                <span className="text-sm text-muted-foreground">
                    {totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''} in the last year
                </span>
            </div>

            {/* Mobile: Show last 20 weeks, Desktop: Show 53 weeks */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-[3px] md:gap-1 min-w-max">
                    {/* Calendar Grid */}
                    {generateCalendarData(typeof window !== 'undefined' && window.innerWidth < 640 ? 26 : 53).map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-[3px] md:gap-1">
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    className={clsx(
                                        "w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm transition-all duration-200",
                                        day.isFuture ? 'bg-transparent' : intensityClasses[getIntensity(day.count)],
                                        day.isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-background'
                                    )}
                                    title={day.isFuture ? '' : `${day.date}: ${day.count} attempt${day.count !== 1 ? 's' : ''}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1.5 md:gap-2 mt-3 md:mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                {intensityClasses.map((cls, i) => (
                    <div key={i} className={clsx("w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm", cls)} />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}
