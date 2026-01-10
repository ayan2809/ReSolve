import { useState, useEffect } from 'react';
import api from '../api/client';
import { Play, Check, X, ExternalLink, CheckCircle, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export default function ReviewSession() {
    const [reviews, setReviews] = useState([]);
    const [currentReview, setCurrentReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [completedCount, setCompletedCount] = useState(0);

    const [solved, setSolved] = useState(true);
    const [timeTaken, setTimeTaken] = useState('');
    const [approach, setApproach] = useState('');
    const [confidence, setConfidence] = useState(3);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await api.get('/reviews/today');
            setReviews(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startReview = (review) => {
        setCurrentReview(review);
        setSolved(true);
        setTimeTaken('');
        setApproach('');
        setConfidence(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentReview) return;

        setSubmitting(true);
        try {
            await api.post(`/reviews/${currentReview.id}/submit`, {
                solved,
                time_taken_minutes: parseInt(timeTaken),
                approach_summary: approach,
                confidence_score: confidence
            });

            setReviews(prev => prev.filter(r => r.id !== currentReview.id));
            setCompletedCount(prev => prev + 1);
            setCurrentReview(null);
        } catch (err) {
            console.error(err);
            alert("Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    const totalReviews = reviews.length + completedCount;
    const progress = totalReviews > 0 ? (completedCount / totalReviews) * 100 : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 md:py-20">
                <Loader2 size={36} className="animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading reviews...</p>
            </div>
        );
    }

    if (currentReview) {
        return (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Progress Bar */}
                <div className="mb-4 md:mb-6">
                    <div className="flex justify-between text-xs md:text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{completedCount} of {totalReviews}</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-4 md:mb-6">
                    <button
                        onClick={() => setCurrentReview(null)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        <ArrowLeft size={18} />
                        <span className="hidden sm:inline">Back to list</span>
                    </button>
                    <span className="badge bg-primary/15 text-primary border border-primary/20 text-xs">
                        {currentReview.interval_label}
                    </span>
                </div>

                {/* Problem Card */}
                <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <h2 className="text-xl md:text-2xl font-bold">{currentReview.problem?.title || 'Unknown Problem'}</h2>
                        <a
                            href={currentReview.problem?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary px-4 py-2 flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                        >
                            Open Problem
                            <ExternalLink size={16} />
                        </a>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Platform: <span className="text-foreground">{currentReview.problem?.platform}</span>
                    </div>
                </div>

                {/* Review Form */}
                <form onSubmit={handleSubmit} className="glass rounded-xl md:rounded-2xl p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Solved Toggle */}
                    <div>
                        <label className="block text-sm font-medium mb-2 md:mb-3">Did you solve it?</label>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                            <button
                                type="button"
                                onClick={() => setSolved(true)}
                                className={clsx(
                                    "py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all duration-200 text-sm",
                                    solved
                                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                                        : "border-white/10 text-muted-foreground hover:border-white/20"
                                )}
                            >
                                <Check size={18} /> Solved
                            </button>
                            <button
                                type="button"
                                onClick={() => setSolved(false)}
                                className={clsx(
                                    "py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all duration-200 text-sm",
                                    !solved
                                        ? "bg-rose-500/15 border-rose-500/50 text-rose-400"
                                        : "border-white/10 text-muted-foreground hover:border-white/20"
                                )}
                            >
                                <X size={18} /> Failed
                            </button>
                        </div>
                    </div>

                    {/* Time and Confidence */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Time (minutes)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={timeTaken}
                                onChange={e => setTimeTaken(e.target.value)}
                                className="input-modern"
                                placeholder="15"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Confidence (1-5)</label>
                            <div className="flex gap-1.5 md:gap-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setConfidence(n)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium transition-all duration-200 text-sm",
                                            confidence === n
                                                ? "bg-primary/15 border-2 border-primary/50 text-primary"
                                                : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Approach Summary */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Approach Summary</label>
                        <textarea
                            required
                            value={approach}
                            onChange={e => setApproach(e.target.value)}
                            rows={3}
                            className="input-modern resize-none"
                            placeholder="Briefly describe your approach..."
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Complete Review
                            </>
                        )}
                    </button>
                </form>
            </div>
        );
    }

    // List View
    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold gradient-text">Today's Reviews</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {reviews.length} problem{reviews.length !== 1 ? 's' : ''} scheduled
                </p>
            </div>

            {/* Progress */}
            {completedCount > 0 && (
                <div className="glass rounded-xl p-3 md:p-4">
                    <div className="flex justify-between text-xs md:text-sm text-muted-foreground mb-2">
                        <span>Session Progress</span>
                        <span>{completedCount} completed</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            )}

            {reviews.length === 0 ? (
                <div className="glass rounded-xl md:rounded-2xl p-8 md:p-12 text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground text-sm md:text-base mb-6">
                        No pending reviews for today.
                    </p>
                    {completedCount > 0 && (
                        <div className="inline-flex items-center gap-2 text-emerald-400 text-sm">
                            <Sparkles size={16} />
                            You completed {completedCount} review{completedCount !== 1 ? 's' : ''} today
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {reviews.map((review) => (
                        <div
                            key={review.id}
                            className="glass rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group hover:bg-white/10 transition-all duration-200"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-base md:text-lg">{review.problem?.title || `Problem #${review.problem_id}`}</span>
                                    <span className="badge bg-white/10 text-muted-foreground text-xs">{review.interval_label}</span>
                                </div>
                                <div className="text-xs md:text-sm text-muted-foreground mt-1">
                                    {review.problem?.platform}
                                </div>
                            </div>

                            <button
                                onClick={() => startReview(review)}
                                className="btn-primary px-4 py-2.5 flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                <Play size={16} fill="currentColor" />
                                Start
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
