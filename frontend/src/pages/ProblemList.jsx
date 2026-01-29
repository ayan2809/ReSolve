import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
    Plus, Link as LinkIcon, ExternalLink, Check, Search, Loader2,
    FolderOpen, X, Download, Filter, SortAsc, ChevronDown,
    Calendar, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';

const STATUS_OPTIONS = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active', icon: Clock, color: 'text-blue-400' },
    { value: 'failed', label: 'Failed', icon: AlertTriangle, color: 'text-rose-400' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-400' },
    { value: 'new', label: 'New', icon: Plus, color: 'text-purple-400' },
];

const DUE_OPTIONS = [
    { value: '', label: 'Any Due Date' },
    { value: 'today', label: 'Due Today' },
    { value: 'week', label: 'Due This Week' },
    { value: 'overdue', label: 'Overdue' },
];

const SORT_OPTIONS = [
    { value: 'created_desc', label: 'Newest First' },
    { value: 'created_asc', label: 'Oldest First' },
    { value: 'next_review', label: 'Next Review' },
    { value: 'failure_count', label: 'Most Failed' },
];

export default function ProblemList() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [problems, setProblems] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ platforms: [], difficulties: [], tags: [] });
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [fetchingTags, setFetchingTags] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Get filter values from URL params
    const filters = {
        status: searchParams.get('status') || '',
        due: searchParams.get('due') || '',
        platform: searchParams.get('platform') || '',
        difficulty: searchParams.get('difficulty') || '',
        tags: searchParams.get('tags') || '',
        q: searchParams.get('q') || '',
        sort: searchParams.get('sort') || 'created_desc',
    };

    const [formData, setFormData] = useState({
        title: '',
        platform: 'LeetCode',
        url: '',
        difficulty: 'Medium',
        tags: ''
    });

    useEffect(() => {
        fetchProblems();
        fetchFilterOptions();
    }, [searchParams]);

    const fetchProblems = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.due) params.set('due', filters.due);
            if (filters.platform) params.set('platform', filters.platform);
            if (filters.difficulty) params.set('difficulty', filters.difficulty);
            if (filters.tags) params.set('tags', filters.tags);
            if (filters.q) params.set('q', filters.q);
            params.set('sort', filters.sort);

            const res = await api.get(`/problems?${params.toString()}`);
            setProblems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/problems/filters');
            setFilterOptions(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams(new URLSearchParams());
    };

    const hasActiveFilters = filters.status || filters.due || filters.platform || filters.difficulty || filters.tags;

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/problems/', {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setShowAddForm(false);
            fetchProblems();
            setFormData({ title: '', platform: 'LeetCode', url: '', difficulty: 'Medium', tags: '' });
        } catch (err) {
            console.error(err);
            alert("Failed to create problem");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFetchTags = async () => {
        if (!formData.url) {
            setFetchError('Please enter a URL first');
            return;
        }
        setFetchingTags(true);
        setFetchError(null);
        try {
            const res = await api.get('/tags/fetch', { params: { url: formData.url } });
            if (res.data.error) {
                setFetchError(res.data.error);
            } else if (res.data.tags.length > 0) {
                setFormData({
                    ...formData,
                    tags: res.data.tags.join(', ')
                });
            } else {
                setFetchError('No tags found for this problem');
            }
        } catch (err) {
            console.error(err);
            setFetchError('Failed to fetch tags');
        } finally {
            setFetchingTags(false);
        }
    };

    const getDifficultyBadge = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'badge-easy';
            case 'Medium': return 'badge-medium';
            case 'Hard': return 'badge-hard';
            default: return 'badge-medium';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Active' };
            case 'failed': return { bg: 'bg-rose-500/15', text: 'text-rose-400', label: 'Failed' };
            case 'completed': return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Done' };
            case 'new': return { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'New' };
            default: return { bg: 'bg-white/10', text: 'text-muted-foreground', label: status };
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text">Problem Bank</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {problems.length} problem{problems.length !== 1 ? 's' : ''}
                        {hasActiveFilters && ' (filtered)'}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    {showAddForm ? <X size={18} /> : <Plus size={18} />}
                    {showAddForm ? 'Cancel' : 'Add Problem'}
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="glass rounded-xl md:rounded-2xl p-4 md:p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Add New Problem</h3>
                    <form onSubmit={handleCreate} className="space-y-4 md:space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">Title</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="input-modern"
                                    placeholder="e.g. Two Sum"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">Platform</label>
                                <select
                                    value={formData.platform}
                                    onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                    className="input-modern"
                                >
                                    <option>LeetCode</option>
                                    <option>HackerRank</option>
                                    <option>Codeforces</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">URL</label>
                                <div className="relative">
                                    <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        required
                                        type="url"
                                        value={formData.url}
                                        onChange={e => setFormData({ ...formData, url: e.target.value })}
                                        className="input-modern pl-12"
                                        placeholder="https://leetcode.com/..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">Difficulty</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                    className="input-modern"
                                >
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-muted-foreground mb-2">Tags (comma separated)</label>
                            <div className="flex gap-2">
                                <input
                                    value={formData.tags}
                                    onChange={e => { setFormData({ ...formData, tags: e.target.value }); setFetchError(null); }}
                                    className="input-modern flex-1"
                                    placeholder="array, dp, sliding window"
                                />
                                <button
                                    type="button"
                                    onClick={handleFetchTags}
                                    disabled={fetchingTags || !formData.url}
                                    className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                                    title="Fetch tags from LeetCode or Codeforces"
                                >
                                    {fetchingTags ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    <span className="hidden sm:inline">Fetch Tags</span>
                                </button>
                            </div>
                            {fetchError && (
                                <p className="text-rose-400 text-xs mt-1">{fetchError}</p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="btn-secondary w-full sm:w-auto"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                {submitting && <Loader2 size={18} className="animate-spin" />}
                                Save Problem
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter Bar */}
            <div className="glass rounded-xl p-3 md:p-4 space-y-3">
                {/* Top Row: Search, Filter Toggle, Sort */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search problems..."
                            value={filters.q}
                            onChange={e => updateFilter('q', e.target.value)}
                            className="input-modern pl-12 w-full"
                        />
                    </div>

                    {/* Filter Toggle & Sort */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-secondary flex items-center gap-2 ${hasActiveFilters ? 'ring-2 ring-primary' : ''}`}
                        >
                            <Filter size={16} />
                            Filters
                            {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
                        </button>

                        <select
                            value={filters.sort}
                            onChange={e => updateFilter('sort', e.target.value)}
                            className="input-modern pr-8"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filter Dropdowns */}
                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                        <select
                            value={filters.status}
                            onChange={e => updateFilter('status', e.target.value)}
                            className="input-modern text-sm"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.due}
                            onChange={e => updateFilter('due', e.target.value)}
                            className="input-modern text-sm"
                        >
                            {DUE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.platform}
                            onChange={e => updateFilter('platform', e.target.value)}
                            className="input-modern text-sm"
                        >
                            <option value="">All Platforms</option>
                            {filterOptions.platforms.map(p => (
                                <option key={p} value={p.toLowerCase()}>{p}</option>
                            ))}
                        </select>

                        <select
                            value={filters.difficulty}
                            onChange={e => updateFilter('difficulty', e.target.value)}
                            className="input-modern text-sm"
                        >
                            <option value="">All Difficulties</option>
                            {filterOptions.difficulties.map(d => (
                                <option key={d} value={d.toLowerCase()}>{d}</option>
                            ))}
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="col-span-2 md:col-span-4 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                            >
                                <X size={14} />
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Problem List */}
            {loading ? (
                <div className="flex items-center justify-center py-16 md:py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : problems.length === 0 ? (
                <div className="glass rounded-xl md:rounded-2xl p-8 md:p-12 text-center">
                    <FolderOpen size={40} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">
                        {hasActiveFilters ? 'No Problems Match Filters' : 'No Problems Yet'}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base mb-6">
                        {hasActiveFilters
                            ? 'Try adjusting your filters or search term.'
                            : 'Start tracking problems to build your review schedule.'}
                    </p>
                    {hasActiveFilters ? (
                        <button
                            onClick={clearFilters}
                            className="btn-secondary inline-flex items-center gap-2"
                        >
                            <X size={18} />
                            Clear Filters
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add First Problem
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {problems.map((problem) => {
                        const statusBadge = getStatusBadge(problem.status);
                        return (
                            <div
                                key={problem.id}
                                className="glass rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-base md:text-lg truncate">{problem.title}</h3>
                                        <span className={`badge text-xs ${getDifficultyBadge(problem.difficulty)}`}>
                                            {problem.difficulty}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${statusBadge.bg} ${statusBadge.text}`}>
                                            {statusBadge.label}
                                        </span>
                                    </div>
                                    <div className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                        <span className="bg-white/5 px-2 py-0.5 rounded">{problem.platform}</span>
                                        {problem.next_review_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {problem.next_review_date}
                                            </span>
                                        )}
                                        {problem.failure_count > 0 && (
                                            <span className="text-rose-400">
                                                {problem.failure_count} failed
                                            </span>
                                        )}
                                    </div>
                                    {problem.tags.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[300px]">
                                            {problem.tags.join(', ')}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
                                    <button
                                        onClick={async () => {
                                            if (confirm('Mark as solved today?')) {
                                                try {
                                                    await api.post(`/problems/${problem.id}/attempts`, {
                                                        solved: true,
                                                        time_taken_minutes: 0,
                                                        approach_summary: "Manual log",
                                                        confidence_score: 5
                                                    });
                                                    fetchProblems();
                                                } catch (err) {
                                                    alert("Failed to log attempt");
                                                }
                                            }
                                        }}
                                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                        title="Mark as Solved"
                                    >
                                        <Check size={18} />
                                    </button>
                                    <a
                                        href={problem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                                        title="Open Problem"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
