import React, { useCallback, useEffect, useState } from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import calculateAge from '../../../../utils/calculateAge';
import flatCount from '../../../../utils/flatCount';
import handleRemoveUser from '../../../../utils/handleRemoveUser';
import Modal from '../../../Shared/Modal/Modal';
import styles from './AllUsers.module.css';

// Loader function to fetch all users from Firestore
export const allUsersLoader = async () => {
  const usersSnapshot = await getDocs(collection(db, 'users')); // Fetch all users from Firestore

  // Map user documents and augment data with age and flat count
  const users = await Promise.all(
    usersSnapshot.docs.map(async (docSnap) => {
      const userData = docSnap.data();
      const flatsCount = await flatCount(docSnap.id); // Count flats owned by the user
      return {
        id: docSnap.id,
        ...userData,
        age: calculateAge(userData.birthDate), // Calculate the user's age
        publishedFlatsCount: flatsCount, // Add flat count dynamically
      };
    })
  );

  return users;
};

const AllUsers = () => {
  const loaderData = useLoaderData() || []; // Load initial user data
  const [allUsersState, setAllUsersState] = useState(loaderData); // Master list of users
  const [users, setUsers] = useState(loaderData); // Filtered list of users
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    userType: '',
    minAge: '',
    maxAge: '',
    minFlats: '',
    maxFlats: '',
    isAdmin: '',
  }); // State for filtering users

  const [sortOption, setSortOption] = useState(''); // State for sorting users

  const [showModal, setShowModal] = useState({ isVisible: false, message: '' }); // Modal state
  const [deleteTargetId, setDeleteTargetId] = useState(null); // ID of user to delete

  // Toggle admin status for a user
  const handleAdminToggle = async (userId, isAdmin) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isAdmin: !isAdmin }); // Update Firestore

      // Update state for both master and filtered lists
      setAllUsersState((prevAll) => prevAll.map((user) => (user.id === userId ? { ...user, isAdmin: !isAdmin } : user)));
      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, isAdmin: !isAdmin } : user)));
    } catch (error) {
      console.error('Error toggling admin permissions:', error);
      alert('Failed to toggle admin permissions.');
    }
  };

  // Update filter state on change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Apply filters and update the filtered users list
  const applyFilters = useCallback(() => {
    let filteredUsers = [...allUsersState];
    const minAge = parseInt(filters.minAge, 10);
    const maxAge = parseInt(filters.maxAge, 10);
    const minFlats = parseInt(filters.minFlats, 10);
    const maxFlats = parseInt(filters.maxFlats, 10);

    // Apply filters based on user type, age range, and flat count
    if (filters.userType === 'admin') {
      filteredUsers = filteredUsers.filter((user) => user.isAdmin === true);
    } else if (filters.userType === 'regular') {
      filteredUsers = filteredUsers.filter((user) => user.isAdmin === false);
    }

    if (!isNaN(minAge)) {
      filteredUsers = filteredUsers.filter((user) => user.age >= minAge);
    }
    if (!isNaN(maxAge)) {
      filteredUsers = filteredUsers.filter((user) => user.age <= maxAge);
    }

    if (!isNaN(minFlats)) {
      filteredUsers = filteredUsers.filter((user) => user.publishedFlatsCount >= minFlats);
    }
    if (!isNaN(maxFlats)) {
      filteredUsers = filteredUsers.filter((user) => user.publishedFlatsCount <= maxFlats);
    }

    // Apply sorting
    const sortedAfterFilter = sortUsers(filteredUsers, sortOption);
    setUsers(sortedAfterFilter);
  }, [allUsersState, filters, sortOption]);

  // Sorting logic based on selected option
  const sortUsers = (usersToSort, option) => {
    let sorted = [...usersToSort];
    switch (option) {
      case 'firstNameAsc':
        sorted.sort((a, b) => a.firstName.localeCompare(b.firstName));
        break;
      case 'firstNameDesc':
        sorted.sort((a, b) => b.firstName.localeCompare(a.firstName));
        break;
      case 'lastNameAsc':
        sorted.sort((a, b) => a.lastName.localeCompare(b.lastName));
        break;
      case 'lastNameDesc':
        sorted.sort((a, b) => b.lastName.localeCompare(a.lastName));
        break;
      case 'flatsCountAsc':
        sorted.sort((a, b) => (a.publishedFlatsCount || 0) - (b.publishedFlatsCount || 0));
        break;
      case 'flatsCountDesc':
        sorted.sort((a, b) => (b.publishedFlatsCount || 0) - (a.publishedFlatsCount || 0));
        break;
      default:
        break;
    }
    return sorted;
  };

  // Reset all filters to default values
  const resetFilters = () => {
    setFilters({
      userType: '',
      minAge: '',
      maxAge: '',
      minFlats: '',
      maxFlats: '',
      isAdmin: '',
    });
    setUsers(allUsersState);
    setSortOption('');
  };

  // Handle changes to the sorting option
  const handleSortChange = (e) => {
    const selectedOption = e.target.value;
    setSortOption(selectedOption);

    let sortedUsers = [...users]; // Make a copy of the current filtered users list

    // Apply sorting based on the selected option
    switch (selectedOption) {
      case 'firstNameAsc':
        sortedUsers.sort((a, b) => a.firstName.localeCompare(b.firstName));
        break;
      case 'firstNameDesc':
        sortedUsers.sort((a, b) => b.firstName.localeCompare(a.firstName));
        break;
      case 'lastNameAsc':
        sortedUsers.sort((a, b) => a.lastName.localeCompare(b.lastName));
        break;
      case 'lastNameDesc':
        sortedUsers.sort((a, b) => b.lastName.localeCompare(a.lastName));
        break;
      case 'flatsCountAsc':
        sortedUsers.sort((a, b) => (a.publishedFlatsCount || 0) - (b.publishedFlatsCount || 0));
        break;
      case 'flatsCountDesc':
        sortedUsers.sort((a, b) => (b.publishedFlatsCount || 0) - (a.publishedFlatsCount || 0));
        break;
      default:
        break; // If no valid option is selected, do nothing
    }
    setUsers(sortedUsers); // Update the filtered users state with the sorted list
  };

  // Delete user and modal logic
  // Confirm deletion of a user - called when the admin clicks "Delete User"
  const confirmDeleteUser = (userId) => {
    setDeleteTargetId(userId);
    setShowModal({
      isVisible: true,
      message: 'Are you sure you want to delete this user?',
    });
  };

  // Handle user deletion - if user confirms "Yes" in the modal
  const handleDeleteAccount = async () => {
    try {
      await handleRemoveUser(deleteTargetId, setUsers); // Remove user and associated data - delete from Firestore, messages, flats

      if (deleteTargetId === localStorage.getItem('loggedInUser')) {
        // If the logged-in user is deleting their own account
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('loginTime');
        navigate('/login');
        window.location.reload();
      } else {
        // If an admin is deleting another user's account
        alert('User account deleted successfully!');
        setShowModal({ isVisible: false, message: '' });
        setDeleteTargetId(null); // Reset the target ID
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user.'); // Alert the user
    }
  };

  // Cancel the deletion of a user - if the admin clicks "No", just hide the modal
  const handleCancelDelete = () => {
    setShowModal({ isVisible: false, message: '' }); // Close the modal
    setDeleteTargetId(null); // Reset the target ID
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
  }, [applyFilters]); // Depend on the applyFilters function

  return (
    <div className={styles.allUsers}>
      <h2>All Registered Users</h2>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="userType">User Type:</label>
          <select id="userType" name="userType" value={filters.userType} onChange={handleFilterChange}>
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="regular">Regular</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Age Range:</label>
          <input type="number" name="minAge" value={filters.minAge} onChange={handleFilterChange} placeholder="Min Age" />
          <input type="number" name="maxAge" value={filters.maxAge} onChange={handleFilterChange} placeholder="Max Age" />
        </div>

        <div className={styles.filterGroup}>
          <label>Flats Count:</label>
          <input type="number" name="minFlats" value={filters.minFlats} onChange={handleFilterChange} placeholder="Min" />
          <input type="number" name="maxFlats" value={filters.maxFlats} onChange={handleFilterChange} placeholder="Max" />
        </div>
        <button onClick={applyFilters} className={styles.applyButton}>
          Apply Filters
        </button>
        <button onClick={resetFilters} className={styles.resetButton}>
          Reset Filters
        </button>
      </div>

      <div className={styles.sort}>
        <div className={styles.sortContainer}>
          <label htmlFor="sortOptions">Sort By:</label>
          <select id="sortOptions" value={sortOption} onChange={handleSortChange}>
            <option value="">None</option>
            <option value="firstNameAsc">First Name (A-Z)</option>
            <option value="firstNameDesc">First Name (Z-A)</option>
            <option value="lastNameAsc">Last Name (A-Z)</option>
            <option value="lastNameDesc">Last Name (Z-A)</option>
            <option value="flatsCountAsc">Flats Count (Ascending)</option>
            <option value="flatsCountDesc">Flats Count (Descending)</option>
          </select>
        </div>
      </div>

      <table className={styles.userTable}>
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Date of Birth</th>
            <th>Age</th>
            <th>Flats Count</th>
            <th>Is Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="8">No users match the criteria.</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.email}</td>
                <td>
                  {new Date(user.birthDate).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })}
                </td>
                <td>{user.age}</td>
                <td>{user.publishedFlatsCount || 0}</td>
                <td>{user.isAdmin ? 'Yes' : 'No'}</td>
                <td>
                  <button onClick={() => navigate(`/users/${user.id}`)}>Profile</button>
                  <button onClick={() => handleAdminToggle(user.id, user.isAdmin)}>{user.isAdmin ? 'Remove Admin' : 'Grant Admin'}</button>
                  <button onClick={() => confirmDeleteUser(user.id)}>Delete User</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Show the modal if needed */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={handleDeleteAccount} onNo={handleCancelDelete} />}
    </div>
  );
};

export default AllUsers;
