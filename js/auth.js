document.addEventListener('DOMContentLoaded', function() {
  // Check if already logged in
  async function checkCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // User is logged in, redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  }
  
  checkCurrentUser();
  
  // Login Form Handler
  const loginForm = document.getElementById('login-button');
  const errorMessage = document.getElementById('error-message');
  
  loginForm.addEventListener('click', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      errorMessage.textContent = 'Please enter both email and password';
      return;
    }
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (error) {
      errorMessage.textContent = error.message;
    } else {
      // Check user role to redirect to the right page
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', data.user.id)
        .single();
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        window.location.href = 'dashboard.html';
      } else {
        // Redirect based on role
        if (profiles.user_role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }
    }
  });
});