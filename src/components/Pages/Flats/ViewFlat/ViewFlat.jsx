import React, { useState } from 'react';
import { useLoaderData, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { BsFillEnvelopeFill, BsFillEnvelopeSlashFill } from 'react-icons/bs';
import { FaHome, FaEdit } from 'react-icons/fa';
import { db } from '../../../../../firebase';
import styles from './ViewFlat.module.css';
import Spinner from '../../../Shared/Spinner/Spinner';

// Loader function to fetch flat details based on flatID
export const viewFlatLoader = async ({ params }) => {
  const flatID = params.flatID; // Extract flat ID from route params
  try {
    const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch flat document from Firestore
    if (!flatDoc.exists()) {
      throw new Error('Flat not found'); // Handle missing flat case
    }
    return { ...flatDoc.data(), id: flatID }; // Return flat data along with its ID
  } catch (error) {
    console.error('Error fetching flat data:', error);
    throw new Response('Failed to fetch flat data.', { status: 404 }); // Return 404 response for errors
  }
};

// Component to view flat details
const ViewFlat = () => {
  const flatData = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const loggedInUserId = localStorage.getItem('loggedInUser'); // Get logged-in user ID from localStorage

  const isOnMessagesRoute = location.pathname.endsWith('/messages'); // Determine if the current route is the messages route
  const [showMessages, setShowMessages] = useState(isOnMessagesRoute); // State to toggle messages visibility

  // Show a loading spinner if flat data is not yet loaded
  if (!flatData) {
    return <Spinner />;
  }

  // Destructure flat data for easier access
  const { id, adTitle, city, streetName, streetNumber, areaSize, hasAC, yearBuilt, rentPrice, dateAvailable, image, ownerID } = flatData;

  // Handle toggling of messages visibility
  const handleToggleMessages = () => {
    if (showMessages) {
      navigate(`/flats/view/${id}`); // Navigate to flat view without messages
      setShowMessages(false);
    } else {
      navigate('messages'); // Navigate to messages route
      setShowMessages(true);
    }
  };

  return (
    <>
      {/* Flat data */}
      <div className={styles.viewFlat}>
        <div className={styles.header}>
          <h2>{adTitle}</h2>
        </div>
        <div className={styles.flatDetails}>
          <div className={styles.imageContainer}>
            <img src={`/flats/${image}`} alt={adTitle} className={styles.flatImage} />
          </div>
          <div className={styles.detailsContainer}>
            <p>
              <strong>City:</strong> {city}
            </p>
            <p>
              <strong>Street Name:</strong> {streetName}
            </p>
            <p>
              <strong>Street Number:</strong> {streetNumber}
            </p>
            <p>
              <strong>Area Size:</strong> {areaSize} m²
            </p>
            <p>
              <strong>Has AC:</strong> {hasAC ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Year Built:</strong> {yearBuilt}
            </p>
            <p>
              <strong>Rent Price:</strong> {rentPrice} €/month
            </p>
            <p>
              <strong>Date Available:</strong> {new Date(dateAvailable).toLocaleDateString()}
            </p>

            {/* Icons for navigation and actions */}
            <div className={styles.icons}>
              {/* Navigate back to homepage */}
              <FaHome className={styles.backToHomepage} title="Back to Homepage" aria-label="Back to Homepage" onClick={() => navigate('/')} />

              {/* Toggle messages visibility */}
              {showMessages ? (
                <BsFillEnvelopeSlashFill className={`${styles.envelopeIcon} ${styles.active}`} title="Hide Messages" aria-label="Hide Messages" onClick={handleToggleMessages} />
              ) : (
                <BsFillEnvelopeFill className={styles.envelopeIcon} title="Show Messages" aria-label="Show Messages" onClick={handleToggleMessages} />
              )}

              {/* Edit flat option (only visible to the owner) */}
              {loggedInUserId === ownerID && <FaEdit className={styles.editFlat} title="Edit Flat" aria-label="Edit Flat" onClick={() => navigate(`/flats/edit/${id}`)} />}
            </div>
          </div>
        </div>
      </div>

      {/* Messages outlet */}
      <div className={showMessages ? styles.visible : styles.hidden}>
        <Outlet context={{ flatID: id, ownerID }} />
      </div>
    </>
  );
};

export default ViewFlat;
