// Persist the state in localStorage so we don't try Supabase on every refresh if we know it's missing tables
let isSupabaseDown = localStorage.getItem('supabase_mode') === 'local';

export const checkSupabase = () => !isSupabaseDown;

export const markSupabaseDown = () => {
    if (!isSupabaseDown) {
        console.warn("Switching to LOCAL MODE: Database tables are missing. Progress will be saved to browser storage.");
        isSupabaseDown = true;
        localStorage.setItem('supabase_mode', 'local');
    }
};

export const resetSupabaseMode = () => {
    isSupabaseDown = false;
    localStorage.removeItem('supabase_mode');
};
