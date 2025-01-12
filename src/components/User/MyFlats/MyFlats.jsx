import React, { useState } from 'react';
import { useLoaderData, useNavigate, redirect } from 'react-router-dom';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { FaRegTrashAlt, FaEdit } from 'react-icons/fa';
import { db } from '../../../../firebase';
import styles from './MyFlats.module.css';

// Loader function to fetch flats owned by the logged-in user
export const myFlatsLoader = async () => {
  const userId = localStorage.getItem('loggedInUser'); // Retrieve logged-in user ID

  if (!userId) {
    return redirect('/login'); // Redirect to login if user is not logged in
  }

  // Query Firestore to fetch flats where the logged-in user is the owner
  const flatsRef = collection(db, 'flats');
  const userFlatsQuery = query(flatsRef, where('ownerID', '==', userId));
  const flatsSnapshot = await getDocs(userFlatsQuery);

  // Map the flats data and sort by creation date (newest first)
  const flats = flatsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      image: `/flats/${doc.data().image}`, // Add the image path for rendering
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Sort by createdAt in descending order

  return { flats, userId }; // Return flats and user ID
};

const MyFlats = () => {
  const { flats: initialFlats, userId } = useLoaderData(); // Load flats and user ID from loader
  const [myFlats, setMyFlats] = useState(initialFlats); // State to manage user's flats
  const navigate = useNavigate();

  // Function to delete a flat and its associated messages
  const handleDeleteFlat = async (flatId) => {
    try {
      // Query messages associated with the flat
      const messagesQuery = query(collection(db, 'messages'), where('flatID', '==', flatId));
      const messagesSnapshot = await getDocs(messagesQuery);

      // Delete all associated messages
      const deleteMessagePromises = messagesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteMessagePromises);

      // Delete the flat itself
      await deleteDoc(doc(db, 'flats', flatId));

      // Update local state to remove the deleted flat - for faster display
      setMyFlats((prevFlats) => prevFlats.filter((flat) => flat.id !== flatId));
    } catch (error) {
      console.error('Error deleting flat and its linked messages:', error);
    }
  };

  return (
    <div className={styles.myFlats}>
      <div className={styles.header}>
        <h2>Manage Your Flats</h2>
        <button className={styles.newFlatButton} onClick={() => navigate('/flats/new')}>
          Insert New Flat
        </button>
      </div>
      {/* Display message if the user has no flats */}
      {myFlats.length === 0 ? (
        <p className={styles.noResults}>You have not published any flats.</p>
      ) : (
        <div className={styles.gridContainer}>
          {myFlats.map((flat) => (
            <div className={styles.gridItem} key={flat.id}>
              <div className={styles.flatImage} onClick={() => navigate(`/flats/view/${flat.id}`)} style={{ cursor: 'pointer' }}>
                <img src={flat.image} alt={flat.adTitle} />
              </div>
              {/* Flat details */}
              <div className={styles.flatDetails}>
                <h3>{flat.adTitle}</h3>
                <p>
                  <strong>City:</strong> {flat.city}
                </p>
                <p>
                  <strong>Street name:</strong> {flat.streetName}
                </p>
                <p>
                  <strong>Street number:</strong> {flat.streetNumber}
                </p>
                <p>
                  <strong>Area size:</strong> {flat.areaSize} m²
                </p>
                <p>
                  <strong>Has AC:</strong> {flat.hasAC ? 'Yes' : 'No'}
                </p>
                <p>
                  <strong>Year built:</strong> {flat.yearBuilt}
                </p>
                <p>
                  <strong>Rent price:</strong> {flat.rentPrice} €/month
                </p>
                <p>
                  <strong>Date available: </strong>
                  {new Date(flat.dateAvailable).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </p>
                {/* Delete and Edit icons */}
                <FaRegTrashAlt className={styles.deleteFlat} onClick={() => handleDeleteFlat(flat.id)} title="Delete Flat" />
                <FaEdit className={styles.editFlat} onClick={() => navigate(`/flats/edit/${flat.id}`)} title="Edit Flat" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyFlats;
