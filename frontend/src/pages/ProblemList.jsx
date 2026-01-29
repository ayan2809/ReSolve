import { useState, useEffect } from 'react';
import api from '../api/client';
import { Plus, Link as LinkIcon, ExternalLink, Check, Search, Loader2, FolderOpen, X, Download } from 'lucide-react';

export default function ProblemList() {
    const [problems, setProblems] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fetchingTags, setFetchingTags] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        platform: 'LeetCode',
        url: '',
        difficulty: 'Medium',
        tags: ''
    });

    useEffect(() => {
        fetchProblems();
    }, []);

    const fetchProblems = async () => {
        try {
            const res = await api.get('/problems');
            setProblems(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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

    const filteredProblems = problems.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );


    const getDifficultyBadge = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'badge-easy';
            case 'Medium': return 'badge-medium';
            case 'Hard': return 'badge-hard';
            default: return 'badge-medium';
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text">Problem Bank</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {problems.length} problem{problems.length !== 1 ? 's' : ''} tracked
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

            {/* Search */}
            {problems.length > 0 && (
                <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search problems or tags..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-modern pl-14"
                    />
                </div>
            )}

            {/* Problem List */}
            {loading ? (
                <div className="flex items-center justify-center py-16 md:py-20">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            ) : problems.length === 0 ? (
                <div className="glass rounded-xl md:rounded-2xl p-8 md:p-12 text-center">
                    <FolderOpen size={40} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">No Problems Yet</h3>
                    <p className="text-muted-foreground text-sm md:text-base mb-6">
                        Start tracking problems to build your review schedule.
                    </p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn-primary inline-flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add First Problem
                    </button>
                </div>
            ) : (
                <div className="space-y-2 md:space-y-3">
                    {filteredProblems.map((problem) => (
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
                                </div>
                                <div className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="bg-white/5 px-2 py-0.5 rounded">{problem.platform}</span>
                                    {problem.tags.length > 0 && (
                                        <span className="truncate max-w-[200px]">{problem.tags.join(', ')}</span>
                                    )}
                                </div>
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
                                                alert("Marked as solved!");
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
                    ))}

                    {filteredProblems.length === 0 && searchTerm && (
                        <div className="text-center py-12 text-muted-foreground">
                            No problems found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
