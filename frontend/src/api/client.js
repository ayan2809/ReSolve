import axios from 'axios';
import { supabase } from '../lib/supabase';

// Use env var or default
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export default api;

// Named API helpers
export const resetPendingReviews = () => api.post('/reviews/reset-pending');
