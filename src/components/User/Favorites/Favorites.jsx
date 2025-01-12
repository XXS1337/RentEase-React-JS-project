import React from 'react';
import { useLoaderData, useNavigate, redirect } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { IoMdHeart } from 'react-icons/io';
import { db } from '../../../../firebase';
import styles from './Favorites.module.css';

// Loader function to fetch the user's favorite flats
export const favoritesLoader = async () => {
  const userId = localStorage.getItem('loggedInUser'); // Retrieve logged-in user I

  if (!userId) {
    return redirect('/login'); // Redirect to login if the user is not logged in
  }

  // Fetch user document from Firestore
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userFavorites = userDoc.exists() ? userDoc.data().favoriteFlats || [] : []; // Retrieve the list of favorite flats

  // Fetch all flats from Firestore
  const flatsRef = collection(db, 'flats');
  const flatsSnapshot = await getDocs(flatsRef);

  // Filter and map favorite flats
  const favorites = [];
  flatsSnapshot.forEach((doc) => {
    const flat = doc.data();
    if (userFavorites.includes(doc.id)) {
      favorites.push({
        id: doc.id,
        ...flat,
        image: `/flats/${flat.image}`, // Add the image path
      });
    }
  });

  // Sort favorites by creation date in descending order
  favorites.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return { favorites, userId }; // Return favorite flats and user ID
};

const Favorites = () => {
  const { favorites, userId } = useLoaderData(); // Load favorite flats and user ID from loader
  const navigate = useNavigate();

  // Handle removing a flat from favorites
  const handleRemoveFavorite = async (flatId) => {
    try {
      const userRef = doc(db, 'users', userId);

      // Update Firestore to remove the flat from user's favorites
      await updateDoc(userRef, {
        favoriteFlats: arrayRemove(flatId),
      });

      // Navigate to the current page with updated favorites
      const updatedFavorites = favorites.filter((flat) => flat.id !== flatId);
      navigate('.', { state: { favorites: updatedFavorites } });
    } catch (error) {
      console.error('Error removing favorite flat:', error);
    }
  };

  return (
    <div className={styles.favorites}>
      <h2>Your Favorite Flats</h2>

      {/* Display message if no favorite flats */}
      {favorites.length === 0 ? (
        <p className={styles.noResults}>You have no favorite flats.</p>
      ) : (
        <div className={styles.gridContainer}>
          {favorites.map((flat) => (
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
                  <strong>Date available:</strong>{' '}
                  {new Date(flat.dateAvailable).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </p>
                {/* Remove from favorites icon */}
                <IoMdHeart className={styles.removeFavorite} onClick={() => handleRemoveFavorite(flat.id)} title="Remove from Favorites" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
