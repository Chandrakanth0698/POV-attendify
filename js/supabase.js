// Initialize Supabase client
const supabaseUrl = 'https://kwspfktrvjmmtsqrzbic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3c3Bma3RydmptbXRzcXJ6YmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NTk5OTEsImV4cCI6MjA1NzUzNTk5MX0.WVfyj94fcUQc-GSaWppHzI-4RycgIga-jU2VedmtAyM';

// Create a single supabase client for interacting with your database
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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