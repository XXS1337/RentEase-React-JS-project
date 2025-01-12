import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import Modal from '../../Shared/Modal/Modal';
import styles from './NavBar.module.css';
import my_logo from './../../../assets/logo/logo-no-background.png';

// NavBar component for site-wide navigation
const NavBar = () => {
  const { user, setUser } = useUser(); // Ensure setUser is available
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState({ isVisible: false, message: '' }); // State for modal visibility and message

  // Effect to fetch user data on mount if logged in
  useEffect(() => {
    const loggedInUserId = localStorage.getItem('loggedInUser'); // Retrieve user ID from localStorage

    if (loggedInUserId) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', loggedInUserId)); // Fetch user data from Firestore
          if (userDoc.exists()) {
            setUser({ id: userDoc.id, ...userDoc.data() }); // Update UserContext state
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchUser();
    }
  }, [setUser]); // Dependency array ensures this runs only when `setUser` changes

  // Navigate to the home page
  const goToHome = () => {
    navigate('/');
  };

  // Trigger the logout confirmation modal
  const logOut = () => {
    setShowModal({ isVisible: true, message: 'Are you sure you want to log out?' });
  };

  // Confirm logout and clear user state and localStorage
  const onYes = () => {
    localStorage.removeItem('loggedInUser'); // Remove user ID from localStorage
    localStorage.removeItem('loginTime'); // Remove session timestamp from localStorage

    setShowModal({ isVisible: false, message: '' }); // Close the modal
    setUser(null); // Clear user data in UserContext

    navigate('/login'); // Redirect to the login page
    window.location.reload(); // Reload the app to reset the NavBar state
  };

  // Cancel logout and close the modal
  const onNo = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  return (
    <div className={styles.navbar}>
      {/* Left side: Logo and greeting */}
      <div className={styles.navbarLeftSide}>
        <div className={styles.navbarLogo}>
          {/* Logo is clickable and navigates to home */}
          <img src={my_logo} alt="Logo" onClick={goToHome} className={styles.clickableLogo} />
          <h2 className={styles.navbarHeading}>Unlock the Door to Your Dream Flat!</h2>
        </div>

        {/* Display user greeting or "Guest" if no user is logged in */}
        <div className={styles.userGreeting}>
          Hello, {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
          {user?.isAdmin && ' (Admin)'}!
        </div>
      </div>

      {/* Navigation links */}
      <nav>
        {!user ? (
          // Links for unauthenticated users
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? styles.active : '')}>
              Login
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? styles.active : '')}>
              Register
            </NavLink>
          </>
        ) : (
          // Links for authenticated users
          <>
            <NavLink to="/myFlats" className={({ isActive }) => (isActive ? styles.active : '')}>
              My Flats
            </NavLink>

            <NavLink to="/favorites" className={({ isActive }) => (isActive ? styles.active : '')}>
              Favorites
            </NavLink>

            <NavLink to="/flats/new" className={({ isActive }) => (isActive ? styles.active : '')}>
              New Flat
            </NavLink>

            <NavLink to={`/users/${user.id}`} className={({ isActive }) => (isActive ? styles.active : '')}>
              My Profile
            </NavLink>

            {/* Admin-only link */}
            {user?.isAdmin && (
              <NavLink to="/admin/all-users" className={({ isActive }) => (isActive ? styles.active : '')}>
                All Users
              </NavLink>
            )}

            {/* Logout button */}
            <button onClick={logOut} className={styles.logoutButton}>
              Logout
            </button>
          </>
        )}
      </nav>

      {/* Modal for logout confirmation */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={onYes} onNo={onNo} />}
    </div>
  );
};

export default NavBar;
