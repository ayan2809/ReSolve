import {
    Sparkles,
    Target,
    Calendar,
    TrendingUp,
    Zap,
    RotateCcw,
    Tag,
    BarChart3,
    CheckCircle,
    Clock,
    ArrowRight,
    Brain
} from 'lucide-react';

export default function About() {
    const steps = [
        {
            icon: Target,
            title: 'Add Problems',
            desc: 'Track LeetCode & Codeforces problems you solve',
            color: 'text-blue-400'
        },
        {
            icon: Calendar,
            title: 'Get Scheduled',
            desc: 'Auto-generated 1d, 7d, 30d, 90d review dates',
            color: 'text-purple-400'
        },
        {
            icon: CheckCircle,
            title: 'Review Daily',
            desc: 'Complete reviews on time to maintain your streak',
            color: 'text-emerald-400'
        },
        {
            icon: Brain,
            title: 'Master Forever',
            desc: 'Build lasting memory through spaced repetition',
            color: 'text-amber-400'
        },
    ];

    const features = [
        {
            icon: Zap,
            title: 'Spaced Repetition',
            description: 'Science-backed 1→7→30→90 day intervals ensure you never forget what you learned.',
            color: 'from-amber-500/20 to-orange-500/20',
            iconColor: 'text-amber-400'
        },
        {
            icon: Tag,
            title: 'Auto Tag Fetching',
            description: 'Automatically fetch problem tags from LeetCode and Codeforces for better organization.',
            color: 'from-blue-500/20 to-cyan-500/20',
            iconColor: 'text-blue-400'
        },
        {
            icon: RotateCcw,
            title: 'Smart Auto-Restart',
            description: 'Missed a review? Failed an attempt? The system auto-restarts from Day 1 — no manual action needed.',
            color: 'from-rose-500/20 to-pink-500/20',
            iconColor: 'text-rose-400'
        },
        {
            icon: BarChart3,
            title: 'Deep Insights',
            description: 'Track performance by difficulty, tags, and time. Identify weak areas and improve.',
            color: 'from-emerald-500/20 to-teal-500/20',
            iconColor: 'text-emerald-400'
        },
        {
            icon: Calendar,
            title: 'Activity Calendar',
            description: 'GitHub-style heatmap shows your daily activity and helps maintain consistency.',
            color: 'from-purple-500/20 to-violet-500/20',
            iconColor: 'text-purple-400'
        },
        {
            icon: TrendingUp,
            title: 'Streak Tracking',
            description: 'Build momentum with consecutive review streaks. Consistency beats intensity.',
            color: 'from-indigo-500/20 to-blue-500/20',
            iconColor: 'text-indigo-400'
        },
    ];

    const intervals = [
        { day: '1', label: 'Day 1', desc: 'First review' },
        { day: '7', label: 'Day 7', desc: 'Weekly review' },
        { day: '30', label: 'Day 30', desc: 'Monthly review' },
        { day: '90', label: 'Day 90', desc: 'Final review' },
    ];

    return (
        <div className="space-y-10 md:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <section className="relative overflow-hidden glass rounded-2xl md:rounded-3xl p-8 md:p-12 text-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/15 rounded-full blur-3xl -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
                        <Sparkles size={32} className="text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                        <span className="gradient-text">ReSolve</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-2">
                        Never forget a coding problem again.
                    </p>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Spaced repetition for competitive programmers. Track, review, and master problems systematically.
                    </p>
                </div>
            </section>

            {/* How It Works */}
            <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                    How It <span className="gradient-text">Works</span>
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {steps.map((step, i) => (
                        <div key={step.title} className="relative">
                            <div className="glass rounded-2xl p-5 md:p-6 text-center h-full">
                                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4 ${step.color}`}>
                                    <step.icon size={24} />
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">Step {i + 1}</div>
                                <h3 className="font-semibold mb-2">{step.title}</h3>
                                <p className="text-sm text-muted-foreground">{step.desc}</p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                                    <ArrowRight size={16} className="text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Spaced Repetition Timeline */}
            <section className="glass rounded-2xl md:rounded-3xl p-6 md:p-10">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium mb-2">
                        <Clock size={16} />
                        The Science Behind It
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold">
                        Spaced Repetition <span className="gradient-text">Timeline</span>
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                        Review at scientifically optimized intervals to maximize retention with minimum effort.
                    </p>
                </div>

                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary/50 rounded-full hidden md:block" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        {intervals.map((interval, i) => (
                            <div key={interval.day} className="relative text-center">
                                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white shadow-lg shadow-primary/25">
                                    {interval.day}d
                                </div>
                                <h4 className="font-semibold">{interval.label}</h4>
                                <p className="text-sm text-muted-foreground">{interval.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                            <RotateCcw size={16} className="text-rose-400" />
                        </div>
                        <div>
                            <h4 className="font-medium text-sm">Strict Discipline Mode</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                Miss a review or fail an attempt? The chain resets to Day 1 automatically.
                                This enforces real learning — no shortcuts, no carry-overs.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section>
                <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                    Powerful <span className="gradient-text">Features</span>
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="glass rounded-2xl p-6 group hover:bg-white/10 transition-all duration-300"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                                <feature.icon size={24} className={feature.iconColor} />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="glass rounded-2xl md:rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">
                        Ready to <span className="gradient-text">Master</span> Your Problems?
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Start tracking your coding problems today and build lasting mastery through consistent review.
                    </p>
                    <a href="/" className="btn-primary inline-flex items-center gap-2">
                        <Sparkles size={18} />
                        Get Started
                    </a>
                </div>
            </section>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pb-4">
                Built with 💜 for competitive programmers
            </div>
        </div>
    );
}
