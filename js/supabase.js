// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Check if user is authenticated
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Redirect to login page if not authenticated
    window.location.href = 'login.html';
  }
  return user;
}

// Logout function
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    window.location.href = 'login.html';
  } else {
    console.error('Error logging out:', error.message);
  }
} 