import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import ErrorPage from '../../ErrorPage/ErrorPage';
import Spinner from '../../Shared/Spinner/Spinner';

// Component to protect routes and optionally restrict access to admin-only
const ProtectedRoute = ({ adminOnly = false }) => {
  const [isLoading, setIsLoading] = useState(true); // State to indicate loading status
  const [isAuthenticated, setIsAuthenticated] = useState(false); // State to track user authentication
  const [isAdmin, setIsAdmin] = useState(false); // State to track admin status
  const loggedInUser = localStorage.getItem('loggedInUser'); // Retrieve logged-in user ID from localStorage
  const location = useLocation();

  // Function to check user authentication and admin status
  useEffect(() => {
    const checkUser = async () => {
      // If no user is logged in, set states accordingly and stop loading
      if (!loggedInUser) {
        setIsLoading(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', loggedInUser)); // Fetch the user's document from Firestore
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAuthenticated(true); // Mark the user as authenticated
          setIsAdmin(userData.isAdmin || false); // Check if the user has admin privileges
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setIsLoading(false); // Stop the loading spinner regardless of success or failure
      }
    };

    checkUser(); // Call the function on component mount
  }, [loggedInUser]); // Dependency on loggedInUser to re-run if it change

  // Show a spinner while loading user data
  if (isLoading) {
    return <Spinner />;
  }

  // Redirect to login if the user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show an error page if the route is admin-only and the user is not an admin
  if (adminOnly && !isAdmin) {
    return <ErrorPage />;
  }

  // Render child routes if the user is authorized
  return <Outlet />;
};

export default ProtectedRoute;
