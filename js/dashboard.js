document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication and get user
  const user = await checkAuth();
  
  // DOM elements
  const userNameElement = document.getElementById('user-name');
  const statusText = document.getElementById('status-text');
  const statusIndicator = document.getElementById('status-indicator');
  const currentDateElement = document.getElementById('current-date');
  const currentTimeElement = document.getElementById('current-time');
  const clockInBtn = document.getElementById('clock-in-btn');
  const clockOutBtn = document.getElementById('clock-out-btn');
  const entryNotes = document.getElementById('entry-notes');
  const activityList = document.getElementById('activity-list');
  const todayHours = document.getElementById('today-hours');
  const weekHours = document.getElementById('week-hours');
  const monthHours = document.getElementById('month-hours');
  const logoutButton = document.getElementById('logout-button');
  
  // Current time tracking
  let currentEntryId = null;
  
  // Update date and time
  function updateDateTime() {
    const now = new Date();
    currentDateElement.textContent = now.toLocaleDateString();
    currentTimeElement.textContent = now.toLocaleTimeString();
  }
  
  setInterval(updateDateTime, 1000);
  updateDateTime();
  
  // Load user profile
  async function loadUserProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, position')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Error loading profile:', error);
      return;
    }
    
    userNameElement.textContent = data.full_name || user.email;
  }
  
  // Check current clock status
  async function checkClockStatus() {
    const { data, error } = await supabase
      .from('time_entries')
      .select('id, clock_in, clock_out, notes, status')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('Error checking clock status:', error);
      return;
    }
    
    if (data && data.length > 0) {
      // User is clocked in
      currentEntryId = data[0].id;
      statusText.textContent = 'Clocked In';
      statusIndicator.classList.add('clocked-in');
      statusIndicator.classList.remove('clocked-out');
      
      clockInBtn.disabled = true;
      clockOutBtn.disabled = false;
      
      // Show current entry notes if any
      entryNotes.value = data[0].notes || '';
      
      // Calculate and show time since clock in
      const clockInTime = new Date(data[0].clock_in);
      const clockInStr = clockInTime.toLocaleTimeString();
      clockInBtn.textContent = `Clocked In at ${clockInStr}`;
    } else {
      // User is clocked out
      currentEntryId = null;
      statusText.textContent = 'Clocked Out';
      statusIndicator.classList.add('clocked-out');
      statusIndicator.classList.remove('clocked-in');
      
      clockInBtn.disabled = false;
      clockOutBtn.disabled = true;
      
      // Clear notes for new entry
      entryNotes.value = '';
      clockInBtn.textContent = 'Clock In';
    }
  }
  
  // Clock in function
  async function clockIn() {
    const notes = entryNotes.value.trim();
    
    const { data, error } = await supabase
      .from('time_entries')
      .insert([
        { 
          user_id: user.id, 
          clock_in: new Date().toISOString(),
          notes: notes,
          status: 'active'
        }
      ])
      .select();
      
    if (error) {
      console.error('Error clocking in:', error);
      return;
    }
    
    currentEntryId = data[0].id;
    
    // Update UI
    checkClockStatus();
    loadRecentActivity();
  }
  
  // Clock out function
  async function clockOut() {
    if (!currentEntryId) return;
    
    const notes = entryNotes.value.trim();
    
    const { error } = await supabase
      .from('time_entries')
      .update({ 
        clock_out: new Date().toISOString(),
        notes: notes,
        status: 'completed'
      })
      .eq('id', currentEntryId);
      
    if (error) {
      console.error('Error clocking out:', error);
      return;
    }
    
    // Update UI
    checkClockStatus();
    loadRecentActivity();
    calculateTimeStats();
  }
  
  // Load recent activity
  async function loadRecentActivity() {
    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, notes, status')
      .eq('user_id', user.id)
      .order('clock_in', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('Error loading recent activity:', error);
      activityList.innerHTML = '<p>Error loading recent activity</p>';
      return;
    }
    
    if (data.length === 0) {
      activityList.innerHTML = '<p>No recent time entries</p>';
      return;
    }
    
    let activityHTML = '';
    
    data.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockInStr = `${clockIn.toLocaleDateString()} ${clockIn.toLocaleTimeString()}`;
      
      let clockOutStr = 'Still active';
      let duration = 'In progress';
      
      if (entry.clock_out) {
        const clockOut = new Date(entry.clock_out);
        clockOutStr = `${clockOut.toLocaleDateString()} ${clockOut.toLocaleTimeString()}`;
        
        // Calculate duration
        const durationMs = clockOut - clockIn;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
        duration = `${durationHours} hours`;
      }
      
      activityHTML += `
        <div class="activity-item ${entry.status}">
          <div class="activity-time">
            <div>In: ${clockInStr}</div>
            <div>Out: ${clockOutStr}</div>
          </div>
          <div class="activity-duration">${duration}</div>
          ${entry.notes ? `<div class="activity-notes">${entry.notes}</div>` : ''}
        </div>
      `;
    });
    
    activityList.innerHTML = activityHTML;
  }
  
  // Calculate time stats
  async function calculateTimeStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Reset now
    now.setHours(23, 59, 59, 999);
    
    // Get all time entries within current month
    const { data, error } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out')
      .eq('user_id', user.id)
      .gte('clock_in', monthStart.toISOString())
      .lte('clock_in', now.toISOString())
      .not('clock_out', 'is', null);
      
    if (error) {
      console.error('Error loading time stats:', error);
      return;
    }
    
    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    
    data.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockOut = new Date(entry.clock_out);
      const durationHours = (clockOut - clockIn) / (1000 * 60 * 60);
      
      // Add to month total
      monthTotal += durationHours;
      
      // Check if within this week
      if (clockIn >= weekStart) {
        weekTotal += durationHours;
      }
      
      // Check if today
      if (clockIn >= todayStart) {
        todayTotal += durationHours;
      }
    });
    
    // Update UI
    todayHours.textContent = `${todayTotal.toFixed(2)} hours`;
    weekHours.textContent = `${weekTotal.toFixed(2)} hours`;
    monthHours.textContent = `${monthTotal.toFixed(2)} hours`;
  }
  
  // Event listeners
  clockInBtn.addEventListener('click', clockIn);
  clockOutBtn.addEventListener('click', clockOut);
  logoutButton.addEventListener('click', logout);
  
  // Initialize
  loadUserProfile();
  checkClockStatus();
  loadRecentActivity();
  calculateTimeStats();
});