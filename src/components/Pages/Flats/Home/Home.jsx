import React, { useCallback, useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { IoMdHeartEmpty, IoMdHeart } from 'react-icons/io';
import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, collection, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import styles from './Home.module.css';

// Loader function to fetch flats and user favorites
export const homeLoader = async () => {
  const userId = localStorage.getItem('loggedInUser'); // Get logged-in user's ID from localStorage

  // Fetch all flats from Firestore
  const flatsSnapshot = await getDocs(collection(db, 'flats'));

  let userFavorites = []; // Initialize an empty array for user favorites

  // If userId exists, fetch the user's favorite flats, otherwise leave it as empty array
  if (userId) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    userFavorites = userDoc.exists() ? userDoc.data().favoriteFlats || [] : [];
  }

  // Map the flats data and mark if they are in the user's favorites
  const flats = flatsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      favorite: userFavorites.includes(doc.id), // Mark as favorite if in user's list
      image: `/flats/${doc.data().image}`, // Generate image path
    }))
    .sort((a, b) => b.createdAt - a.createdAt); // Sort flats by creation date (newest first)

  return { flats, userId }; // Return flats and userId
};

const Home = () => {
  const { flats: initialFlats, userId } = useLoaderData(); // Load flats and user ID
  const [flats, setFlats] = useState(initialFlats); // State for all flats
  const [filteredFlats, setFilteredFlats] = useState(initialFlats); // State for filtered flats
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
  }); // State for filters
  const [sortOption, setSortOption] = useState(''); // State for sorting
  const navigate = useNavigate();

  // Apply filters and sort flats
  const applyFilters = useCallback(() => {
    let updatedFlats = [...flats]; // Start with all flats

    // Filter by city name
    if (filters.city) {
      updatedFlats = updatedFlats.filter((flat) => flat.city.toLowerCase().includes(filters.city.toLowerCase()));
    }

    // Filter by price range
    if (filters.minPrice) {
      updatedFlats = updatedFlats.filter((flat) => flat.rentPrice >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      updatedFlats = updatedFlats.filter((flat) => flat.rentPrice <= parseFloat(filters.maxPrice));
    }

    // Filter by area range
    if (filters.minArea) {
      updatedFlats = updatedFlats.filter((flat) => flat.areaSize >= parseFloat(filters.minArea));
    }
    if (filters.maxArea) {
      updatedFlats = updatedFlats.filter((flat) => flat.areaSize <= parseFloat(filters.maxArea));
    }

    // Sort the filtered flats
    const sortedAfterFilter = sortFlats(updatedFlats, sortOption);

    // Update the state with filtered and sorted flats
    setFilteredFlats(sortedAfterFilter);
  }, [flats, filters, sortOption]);

  // Sorting logic for flats
  const sortFlats = (flatsToSort, option) => {
    let sortedFlats = [...flatsToSort]; // Clone the flats array

    // Sorting options
    switch (option) {
      case 'cityAsc':
        sortedFlats.sort((a, b) => a.city.localeCompare(b.city));
        break;
      case 'cityDesc':
        sortedFlats.sort((a, b) => b.city.localeCompare(a.city));
        break;
      case 'priceAsc':
        sortedFlats.sort((a, b) => a.rentPrice - b.rentPrice);
        break;
      case 'priceDesc':
        sortedFlats.sort((a, b) => b.rentPrice - a.rentPrice);
        break;
      case 'areaAsc':
        sortedFlats.sort((a, b) => a.areaSize - b.areaSize);
        break;
      case 'areaDesc':
        sortedFlats.sort((a, b) => b.areaSize - a.areaSize);
        break;
      default:
        break;
    }
    return sortedFlats; // Return sorted flats
  };

  // Handle sort option change
  const handleSortChange = (e) => {
    const selectedOption = e.target.value; // Get selected sort option
    setSortOption(selectedOption); // Update sort option state

    // Sort and update the filtered flats
    const sortedFlats = sortFlats(filteredFlats, selectedOption);
    setFilteredFlats(sortedFlats);
  };

  // Toggle a flat as a favorite
  const handleFavorite = async (flat) => {
    if (!userId) {
      navigate('/login'); // Redirect to login if user is not logged in
      return;
    }

    try {
      const userRef = doc(db, 'users', userId); // Reference to the user document

      if (flat.favorite) {
        await updateDoc(userRef, { favoriteFlats: arrayRemove(flat.id) }); // Remove from favorites
      } else {
        await updateDoc(userRef, { favoriteFlats: arrayUnion(flat.id) }); // Add to favorites
      }

      // Update flats and filteredFlats states
      const updatedFlats = flats.map((f) => (f.id === flat.id ? { ...f, favorite: !flat.favorite } : f));
      setFlats(updatedFlats);

      // Re-apply filters and sorting after the update
      let updatedFilteredFlats = updatedFlats;
      if (filters.city || filters.minPrice || filters.maxPrice || filters.minArea || filters.maxArea) {
        updatedFilteredFlats = updatedFilteredFlats.filter((f) => {
          let matches = true;

          if (filters.city) {
            matches = matches && f.city.toLowerCase().includes(filters.city.toLowerCase());
          }
          if (filters.minPrice) {
            matches = matches && f.rentPrice >= parseFloat(filters.minPrice);
          }
          if (filters.maxPrice) {
            matches = matches && f.rentPrice <= parseFloat(filters.maxPrice);
          }
          if (filters.minArea) {
            matches = matches && f.areaSize >= parseFloat(filters.minArea);
          }
          if (filters.maxArea) {
            matches = matches && f.areaSize <= parseFloat(filters.maxArea);
          }

          return matches;
        });
      }

      // Sort and update the filtered flats
      const sortedFlats = sortFlats(updatedFilteredFlats, sortOption);
      setFilteredFlats(sortedFlats);
    } catch (error) {
      console.error('Error updating favorite flats:', error); // Log any errors
    }
  };

  // Handle filter input changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value })); // Update the corresponding filter
  };

  // Reset filters to default values
  const resetFilters = () => {
    setFilters({
      city: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
    });
    setSortOption('createdAtDesc'); // Reset sort option to default (descending)
    const sortedFlats = sortFlats(flats, 'createdAtDesc'); // Sort flats by creation date
    setFilteredFlats(sortedFlats); // Update state with default-sorted flats
  };

  // Listen for "Enter" key to apply filters
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        applyFilters(); // Apply filters when Enter is pressed
      }
    };

    window.addEventListener('keydown', handleKeyDown); // Add event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown); // Cleanup on unmount
    };
  }, [applyFilters]);

  return (
    <div className={styles.home}>
      <h2>Available Flats</h2>

      {/* Filters section */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="city">City:</label>
          <input type="text" id="city" name="city" value={filters.city} onChange={handleFilterChange} placeholder="Enter city" />
        </div>
        <div className={styles.filterGroup}>
          <label>Price Range:</label>
          <input type="number" name="minPrice" value={filters.minPrice} onChange={handleFilterChange} placeholder="Min (€)" />
          <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleFilterChange} placeholder="Max (€)" />
        </div>
        <div className={styles.filterGroup}>
          <label>Area Size (m²):</label>
          <input type="number" name="minArea" value={filters.minArea} onChange={handleFilterChange} placeholder="Min" />
          <input type="number" name="maxArea" value={filters.maxArea} onChange={handleFilterChange} placeholder="Max" />
        </div>
        <button onClick={applyFilters} className={styles.applyButton}>
          Apply Filters
        </button>
        <button onClick={resetFilters} className={styles.resetButton}>
          Reset Filters
        </button>
      </div>

      {/* Sorting section */}
      <div className={styles.sort}>
        <div className={styles.sortContainer}>
          <label htmlFor="sortOptions">Sort By:</label>
          <select id="sortOptions" value={sortOption} onChange={handleSortChange}>
            <option value="">None</option>
            <option value="cityAsc">City (A-Z)</option>
            <option value="cityDesc">City (Z-A)</option>
            <option value="priceAsc">Price (Low to High)</option>
            <option value="priceDesc">Price (High to Low)</option>
            <option value="areaAsc">Area Size (Small to Large)</option>
            <option value="areaDesc">Area Size (Large to Small)</option>
          </select>
        </div>
      </div>

      {/* Flats grid display */}
      <div className={styles.gridContainer}>
        {filteredFlats.length === 0 ? (
          <p className={styles.noResults}>No flats match your search criteria.</p>
        ) : (
          filteredFlats.map((flat) => (
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
                {/* Favorite button */}
                {flat.favorite ? (
                  <IoMdHeart
                    className={styles.filledHeart}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite(flat);
                    }}
                  />
                ) : (
                  <IoMdHeartEmpty
                    className={styles.emptyHeart}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite(flat);
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
