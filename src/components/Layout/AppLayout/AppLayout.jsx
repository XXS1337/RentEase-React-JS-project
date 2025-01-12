import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { checkSessionExpiry } from '../../../utils/sessionUtils';
import NavBar from '../NavBar/NavBar';
import Footer from '../Footer/Footer';
import styles from './AppLayout.module.css';

// AppLayout component provides the layout structure for the application
const AppLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkSessionExpiry(navigate); // Immediately check if the user's session has expired

    // Set up an interval to periodically check for session expiration (every 1 minute)
    const interval = setInterval(() => {
      checkSessionExpiry(navigate);
    }, 60 * 1000); // 1 minute in milliseconds

    // Cleanup the interval when the component is unmounted to prevent memory leaks
    return () => clearInterval(interval);
  }, [navigate]); // Dependency array ensures the effect runs only when `navigate` changes

  return (
    <div className="maxWidthContainer">
      {/* Header containing the navigation bar */}
      <header>
        <NavBar />
      </header>

      {/* Main content area where child routes will render */}
      <main className={styles.contentArea}>
        <Outlet />
      </main>

      {/* Footer displayed at the bottom of the page */}
      <footer>
        <Footer />
      </footer>
    </div>
  );
};

export default AppLayout;
