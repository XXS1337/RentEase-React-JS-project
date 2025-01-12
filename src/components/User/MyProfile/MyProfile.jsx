import React, { useState, useEffect } from 'react';
import { Form, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import handleRemoveUser from '../../../utils/handleRemoveUser';
import Modal from '../../Shared/Modal/Modal';
import styles from './MyProfile.module.css';
import { useUser } from '../../../context/UserContext';
import calculateAge from '../../../utils/calculateAge';
import Spinner from '../../Shared/Spinner/Spinner';

// Action to handle updating the user's profile
export const myProfileAction = async ({ request }) => {
  const formData = await request.formData(); // Parse form data from the request
  const editedUserId = formData.get('editedUserId'); // Extract the edited user's ID from the formData

  if (!editedUserId) {
    return { errors: { general: 'User not found.' } }; // Handle missing user ID
  }

  // Extract fields from the form
  const firstName = formData.get('firstName');
  const lastName = formData.get('lastName');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const birthDate = formData.get('birthDate'); // Extract birthDate field

  const errors = {}; // Object to store validation errors
  if (!firstName || firstName.length < 2) errors.firstName = 'First name must be at least 2 characters.';
  if (!lastName || lastName.length < 2) errors.lastName = 'Last name must be at least 2 characters.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Invalid email format.';
  } else {
    const emailQuery = query(collection(db, 'users'), where('email', '==', email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty && email !== localStorage.getItem('loggedInUserEmail')) {
      errors.email = 'The email you entered cannot be used. Please try another one.';
    }
  }
  if (password && (password.length < 6 || !/[a-zA-Z]/.test(password) || !/\d/.test(password) || !/[^\w\s]/.test(password))) {
    errors.password = 'Password must include letters, numbers, and a special character.';
  }
  if (password && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  if (birthDate) {
    // Only validate birthDate if it is provided
    if (isNaN(new Date(birthDate).getTime())) {
      errors.birthDate = 'Birth date is required.';
    } else {
      const age = calculateAge(birthDate);
      if (age < 18 || age > 120) errors.birthDate = 'Age must be between 18 and 120.';
    }
  }

  // Return errors if validation fails
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const userDocRef = doc(db, 'users', editedUserId); // Reference to the edited user's Firestore document

    const updatedData = { firstName, lastName, email };

    if (password) {
      updatedData.password = password; // Include password if it was updated
    }

    if (birthDate) {
      updatedData.birthDate = birthDate; // Include birthDate if it was updated
    }

    await updateDoc(userDocRef, updatedData); // Update user data in Firestore

    // Fetch updated user data
    const updatedUserDoc = await getDoc(userDocRef);
    const updatedUserData = { id: updatedUserDoc.id, ...updatedUserDoc.data() };

    return { success: true, user: updatedUserData }; // Pass the updated user data back to the component
  } catch (error) {
    console.error('Error updating profile:', error);
    return { errors: { general: 'Failed to update profile. Please try again.' } };
  }
};

const MyProfile = () => {
  const { userID } = useParams(); // Retrieve the userID from the route parameters if editing another user's profile
  const navigate = useNavigate();
  const { setUser } = useUser(); // Access the global user context to update the logged-in user's data globally
  const [loggedInUserId, setLoggedInUserId] = useState(null); // State for the logged-in user
  const [editedUserId, setEditedUserId] = useState(null); // State for the user being edited

  // State variables to manage form data, validation errors, loading status, and modals
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });
  const [originalData, setOriginalData] = useState(null); // Store the original data to track changes
  const [fieldErrors, setFieldErrors] = useState({}); // Store validation errors for specific fields
  const [isCheckingEmail, setIsCheckingEmail] = useState(false); // Manage email availability check state
  const [isLoading, setIsLoading] = useState(true); // Manage loading state while data is fetched
  const [showModal, setShowModal] = useState({ isVisible: false, message: '' }); // Manage modal visibility and content

  // Resolve logged-in user and edited user IDs
  useEffect(() => {
    const storedUserId = localStorage.getItem('loggedInUser'); // Resolve logged-in user and edited user IDs
    if (!storedUserId) {
      navigate('/login'); // Redirect to login if no logged-in user is found
      return;
    }
    setLoggedInUserId(storedUserId); // Set the logged-in user's ID in state

    // Determine the edited user:
    // - If `userID` is present (from route params), set it as the edited user (admin editing another user).
    // - Otherwise, default to the logged-in user (editing their own profile).
    if (userID) {
      setEditedUserId(userID);
    } else {
      setEditedUserId(storedUserId);
    }
  }, [userID, navigate]); // Dependencies: Re-run if `userID` or `navigate` changes

  // Fetch data for the edited user
  useEffect(() => {
    if (!editedUserId) return; // Wait until `editedUserId` is resolved

    const fetchUserData = async () => {
      try {
        // Fetch the edited user's data from Firestore
        const userDoc = await getDoc(doc(db, 'users', editedUserId));

        if (userDoc.exists()) {
          const data = userDoc.data();

          // Store the original user data
          setOriginalData(data);

          // Populate the form fields with the fetched user data
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            password: '', // Do not pre-fill password fields for security reasons
            confirmPassword: '',
            birthDate: data.birthDate || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false); // Stop the loading spinner once data is fetched
      }
    };
    fetchUserData(); // Call the function to fetch user data
  }, [editedUserId]); // Dependencies: Re-run if `editedUserId` changes

  if (isLoading) {
    return <Spinner />; // Display a loading spinner while data is being fetched
  }

  // Function to validate individual form fields
  const validateField = async (name, value) => {
    let error = '';
    if (name === 'email') {
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Email must be in a valid format.';
      } else if (value !== originalData.email) {
        setIsCheckingEmail(true);
        const existingUsersQuery = query(collection(db, 'users'), where('email', '==', value));
        const existingUsersSnapshot = await getDocs(existingUsersQuery);
        if (!existingUsersSnapshot.empty) {
          error = 'The email you entered cannot be used. Please try another one.';
        }
        setIsCheckingEmail(false);
      }
    } else if (name === 'password') {
      if (value && value.length < 6) {
        error = 'Password must be at least 6 characters long.';
      } else if (value && (!/[a-zA-Z]/.test(value) || !/\d/.test(value) || !/[^\w\s]/.test(value))) {
        error = 'Password must include letters, numbers, and a special character.';
      }
    } else if (name === 'confirmPassword') {
      if (value !== formData.password) {
        error = 'Passwords do not match.';
      }
    } else if (name === 'birthDate') {
      // Validate birthDate using calculateAge
      if (!value || isNaN(new Date(value).getTime())) {
        error = 'Birth date is required.';
      } else {
        const age = calculateAge(value);
        if (age < 18 || age > 120) {
          error = 'Age must be between 18 and 120.';
        }
      }
    } else {
      // Validate other text fields (firstName, lastName)
      const fieldDisplayName = name
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
        .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize the first letter

      if (!value || value.length < 2) {
        error = `${fieldDisplayName} must be at least 2 characters.`;
      }
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error })); // Update validation errors in state
  };

  // Handle field blur (losing focus) by validating the field
  const handleBlur = async (e) => {
    const { name, value } = e.target;
    await validateField(name, value);
  };

  // Handle changes in form fields and reset errors for that field
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value })); // Update form data
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear errors for the specific field
  };

  // Check if the form is valid and has changes to submit
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error); // Check for validation errors
    const hasChanges =
      originalData &&
      (formData.firstName !== originalData.firstName ||
        formData.lastName !== originalData.lastName ||
        formData.email !== originalData.email ||
        formData.birthDate !== originalData.birthDate ||
        formData.password !== '' ||
        formData.confirmPassword !== '');
    return !hasErrors && hasChanges && !isCheckingEmail; // Form is valid if there are no errors and changes exist
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) return; // Stop submission if the form is invalid

    try {
      const userDocRef = doc(db, 'users', editedUserId); // Use editedUserId to target the correct user document
      const updatedData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        birthDate: formData.birthDate,
      };

      if (formData.password) {
        updatedData.password = formData.password; // Include password if updated
      }

      await updateDoc(userDocRef, updatedData); // Update user data in Firestore

      // Fetch updated user data
      const updatedUserDoc = await getDoc(userDocRef);
      const updatedUserData = { id: updatedUserDoc.id, ...updatedUserDoc.data() };

      // If the logged-in user is editing their own profile, update their context
      if (loggedInUserId === editedUserId) {
        setUser(updatedUserData);
      }

      // Check if the logged-in user is an admin
      const loggedInUserDoc = await getDoc(doc(db, 'users', localStorage.getItem('loggedInUser')));
      const isAdmin = loggedInUserDoc.exists() && loggedInUserDoc.data().isAdmin;

      // Determine redirection logic
      if (isAdmin) {
        if (loggedInUserId === editedUserId) {
          // Admin updated their own profile
          alert('Profile updated successfully!');
          navigate('/');
        } else {
          // Admin updated someone else's profile
          alert('Profile updated successfully!');
          navigate('/admin/all-users');
        }
      } else {
        // Regular user updated their own profile
        alert('Profile updated successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      await handleRemoveUser(editedUserId, () => {}); // Remove the edited user's account and associated data from Firestore

      if (editedUserId === loggedInUserId) {
        // If the logged-in user is deleting their own account
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('loginTime');
        navigate('/login');
        window.location.reload();
      } else {
        // If an admin is deleting another user's account
        alert('User account deleted successfully!');
        setShowModal({ isVisible: false, message: '' });
        navigate('/admin/all-users');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user.');
    }
  };

  // Close the delete confirmation modal
  const handleCancelDelete = () => {
    setShowModal({ isVisible: false, message: '' });
  };

  return (
    <div className={styles.profile}>
      {/* Dynamically set the title based on whether the logged-in user is editing their own profile or other users profile */}
      <h2>{editedUserId === loggedInUserId ? 'My Profile' : `Editing Profile: ${originalData?.firstName} ${originalData?.lastName}`}</h2>

      {/* Display user details*/}
      {originalData && (
        <div className={styles.profileDetails}>
          <h3>User Details</h3>
          <p>
            <strong>First Name:</strong> {originalData.firstName}
          </p>
          <p>
            <strong>Last Name:</strong> {originalData.lastName}
          </p>
          <p>
            <strong>Email:</strong> {originalData.email}
          </p>
          <p>
            <strong>Date of Birth:</strong>{' '}
            {new Date(originalData.birthDate).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}
          </p>
          <p>
            <strong>Registered at:</strong> {new Date(originalData.createdAt).toLocaleString()}
          </p>
        </div>
      )}
      {/*Form for updating the profile */}
      <h3 className={styles.formTitle}>Update Profile</h3>
      <Form method="post" className={styles.form} onSubmit={handleSubmit}>
        <input type="hidden" name="editedUserId" value={editedUserId} />
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>Checking email availability...</p>}
          {fieldErrors.email && <p className={styles.error}>{fieldErrors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">Date of Birth:</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        {/* Submit Button */}
        <button type="submit" className={styles.updateButton} disabled={!isFormValid()}>
          Update
        </button>
      </Form>
      {/*Delete Account button - triggers the confirmation modal */}
      <button
        className={styles.deleteButton}
        onClick={() =>
          setShowModal({
            isVisible: true,
            message: 'Are you sure you want to delete your account?',
          })
        }
      >
        Delete Account
      </button>
      {/* Confirmation Modal */}
      {showModal.isVisible && <Modal message={showModal.message} onYes={handleDeleteAccount} onNo={handleCancelDelete} />}
    </div>
  );
};

export default MyProfile;
