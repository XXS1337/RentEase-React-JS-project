// Function to check if the user's session has expired
export function checkSessionExpiry(navigate) {
  const loginTime = localStorage.getItem('loginTime'); // Retrieve the login timestamp from localStorage
  const currentTime = Date.now(); // Get the current timestamp

  const sessionDuration = 60 * 60 * 1000; // Define the session duration (60 minutes in milliseconds)

  // If loginTime exists and the session duration has elapsed, log the user out
  if (loginTime && currentTime - loginTime > sessionDuration) {
    alert('Session expired. You will be logged out.');
    logoutUser(navigate); // Call the logout function
  }
}

// Function to log out the user
export function logoutUser(navigate) {
  // Remove user-related data from localStorage
  localStorage.removeItem('loggedInUser');
  localStorage.removeItem('loginTime');

  navigate('/login'); // Redirect the user to the login page
}

// Function to set login details in localStorage
export function setLoginSession(userID) {
  const currentTime = Date.now(); // Store the current timestamp and user ID in localStorage
  localStorage.setItem('loggedInUser', userID);
  localStorage.setItem('loginTime', currentTime);
}
