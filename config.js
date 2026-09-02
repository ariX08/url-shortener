// ============================================================
// SUPABASE CONFIG — replace with your own project values
// ============================================================
// 1. Create a free project at https://supabase.com
// 2. Go to Project Settings → API
// 3. Copy Project URL and anon public key below
// 4. Run the SQL in schema.sql in the Supabase SQL Editor
// ============================================================

window.SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY";

// Base URL used when building short links (change after deploying)
// Example for GitHub Pages: "https://arix08.github.io/url-shortener"
window.SHORT_BASE = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "") || window.location.origin;
