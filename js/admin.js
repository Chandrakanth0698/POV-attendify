document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication and get user
  const user = await checkAuth();
  
  // Check if user is admin
  async function checkAdminRole() {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();
      
    if (error || !data || data.user_role !== 'admin') {
      // Not an admin, redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  }
  
  await checkAdminRole();
  
  // DOM elements
  const adminNameElement = document.getElementById('admin-name');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const employeeSelect = document.getElementById('employee-select');
  const filterButton = document.getElementById('filter-button');
  const exportCsvButton = document.getElementById('export-csv');
  const totalHoursElement = document.getElementById('total-hours');
  const avgHoursElement = document.getElementById('avg-hours');
  const activeEmployeesElement = document.getElementById('active-employees');
  const reportTableBody = document.getElementById('report-table-body');
  const logoutButton = document.getElementById('logout-button');
  
  // Set default date range (current month)
  function setDefaultDateRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Format dates for input elements
    dateFromInput.value = formatDateForInput(firstDay);
    dateToInput.value = formatDateForInput(now);
  }
  
  function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }
  
  // Load admin profile
  async function loadAdminProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
      
    if (error) {
      console.error('Error loading admin profile:', error);
      return;
    }
    
    adminNameElement.textContent = data.full_name || user.email;
  }
  
  // Load all employees for the filter dropdown
  async function loadEmployees() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name', { ascending: true });
      
    if (error) {
      console.error('Error loading employees:', error);
      return;
    }
    
    // Populate dropdown
    data.forEach(employee => {
      const option = document.createElement('option');
      option.value = employee.id;
      option.textContent = employee.full_name;
      employeeSelect.appendChild(option);
    });
  }
  
  // Load time entries based on filters
  async function loadTimeEntries() {
    const dateFrom = dateFromInput.value;
    const dateTo = dateToInput.value;
    const employeeId = employeeSelect.value;
    
    // Build query
    let query = supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_out,
        notes,
        status,
        user_id,
        profiles(full_name)
      `)
      .gte('clock_in', `${dateFrom}T00:00:00`)
      .lte('clock_in', `${dateTo}T23:59:59`)
      .order('clock_in', { ascending: false });
      
    // Add employee filter if specific employee selected
    if (employeeId !== 'all') {
      query = query.eq('user_id', employeeId);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error loading time entries:', error);
      reportTableBody.innerHTML = '<tr><td colspan="7">Error loading data</td></tr>';
      return;
    }
    
    if (data.length === 0) {
      reportTableBody.innerHTML = '<tr><td colspan="7">No entries found for the selected period</td></tr>';
      resetStats();
      return;
    }
    
    // Populate table
    let tableHTML = '';
    let totalHours = 0;
    const activeEmployees = new Set();
    
    data.forEach(entry => {
      const clockIn = new Date(entry.clock_in);
      const clockInDate = clockIn.toLocaleDateString();
      const clockInTime = clockIn.toLocaleTimeString();
      
      let clockOutTime = 'Still active';
      let duration = 'In progress';
      let durationHours = 0;
      
      if (entry.clock_out) {
        const clockOut = new Date(entry.clock_out);
        clockOutTime = clockOut.toLocaleTimeString();
        
        // Calculate duration
        durationHours = (clockOut - clockIn) / (1000 * 60 * 60);
        duration = `${durationHours.toFixed(2)} hours`;
        totalHours += durationHours;
      }
      
      activeEmployees.add(entry.user_id);
      
      tableHTML += `
        <tr>
          <td>${entry.profiles.full_name}</td>
          <td>${clockInDate}</td>
          <td>${clockInTime}</td>
          <td>${clockOutTime}</td>
          <td>${duration}</td>
          <td>${entry.status}</td>
          <td>${entry.notes || ''}</td>
        </tr>
      `;
    });
    
    reportTableBody.innerHTML = tableHTML;
    
    // Update stats
    const avgHours = totalHours / data.filter(entry => entry.clock_out).length;
    
    totalHoursElement.textContent = `${totalHours.toFixed(2)} hours`;
    avgHoursElement.textContent = `${isNaN(avgHours) ? '0' : avgHours.toFixed(2)} hours`;
    activeEmployeesElement.textContent = activeEmployees.size;
  }
  
  // Reset stats when no data
  function resetStats() {
    totalHoursElement.textContent = '0 hours';
    avgHoursElement.textContent = '0 hours';
    activeEmployeesElement.textContent = '0';
  }
  
  // Export data to CSV
  async function exportToCsv() {
    const dateFrom = dateFromInput.value;
    const dateTo = dateToInput.value;
    const employeeId = employeeSelect.value;
    
    // Build query
    let query = supabase
      .from('time_entries')
      .select(`
        id,
        clock_in,
        clock_out,