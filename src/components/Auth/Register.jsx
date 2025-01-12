import React, { useState, useEffect } from 'react';
import { Form, useActionData, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import calculateAge from '../../utils/calculateAge';
import styles from './Auth.module.css';

// Action to handle user registration
export const registerAction = async ({ request }) => {
  const formData = await request.formData(); // Extract form data from the request
  const firstName = formData.get('firstName');
  const lastName = formData.get('lastName');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const birthDate = formData.get('birthDate');

  // Perform form fields validations and provide client-side validation and feedback

  const errors = {}; // Object to store validation errors

  // Validate each field
  if (!firstName || firstName.length < 2) errors.firstName = 'First name must be at least 2 characters.';
  if (!lastName || lastName.length < 2) errors.lastName = 'Last name must be at least 2 characters.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email must be in a valid format.';
  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    errors.password = 'Password must include letters, numbers, and a special character.';
  }
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!birthDate || isNaN(new Date(birthDate).getTime())) {
    errors.birthDate = 'Birth date is required.';
  } else {
    const age = calculateAge(birthDate);
    if (age < 18 || age > 120) errors.birthDate = 'Age must be between 18 and 120.';
  }

  // Return errors if any validation fails
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    // Check if the email is already registered in Firestore
    const existingUsersQuery = query(collection(db, 'users'), where('email', '==', email));
    const existingUsersSnapshot = await getDocs(existingUsersQuery);

    if (!existingUsersSnapshot.empty) {
      return { errors: { email: 'This email is not available. Please try another or log in if you already have an account.' } };
    }

    // Add new user to Firestore
    await addDoc(collection(db, 'users'), {
      firstName,
      lastName,
      email,
      password,
      birthDate,
      favoriteFlats: [],
      isAdmin: false,
      createdAt: Date.now(),
    });

    return { success: true };
  } catch (error) {
    return { errors: { general: 'Registration failed. Please try again.' } };
  }
};

const Register = () => {
  const actionData = useActionData();
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState({}); // Holds validation errors for each field
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
  });
  const [generalError, setGeneralError] = useState(null); // General error state
  const [isCheckingEmail, setIsCheckingEmail] = useState(false); // Indicates if the email is being checked for uniqueness

  //Redirects to the login page upon successful registration.
  useEffect(() => {
    if (actionData?.success) {
      alert('Registration successful! Redirecting to login page.');
      navigate('/login');
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, navigate]);

  // Validate individual form fields. Displays error messages if validation fails. Performs real-time email availability check via Firestore.
  const validateField = async (name, value) => {
    let error = '';
    switch (name) {
      case 'firstName':
        if (!value || value.length < 2) error = 'First name must be at least 2 characters.';
        break;
      case 'lastName':
        if (!value || value.length < 2) error = 'Last name must be at least 2 characters.';
        break;
      case 'email':
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email must be in a valid format.';
        } else {
          setIsCheckingEmail(true);
          const existingUsersQuery = query(collection(db, 'users'), where('email', '==', value));
          const existingUsersSnapshot = await getDocs(existingUsersQuery);
          if (!existingUsersSnapshot.empty) {
            error = 'This email is not available. Please try another or log in if you already have an account.';
          }
          setIsCheckingEmail(false);
        }
        break;
      case 'password':
        if (!value || value.length < 6) {
          error = 'Password must be at least 6 characters long.';
        } else if (!/[a-zA-Z]/.test(value) || !/\d/.test(value) || !/[^\w\s]/.test(value)) {
          error = 'Password must include letters, numbers, and a special character.';
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) error = 'Passwords do not match.';
        break;
      case 'birthDate':
        if (!value || isNaN(new Date(value).getTime())) {
          error = 'Birth date is required.';
        } else {
          const age = calculateAge(value);
          if (age < 18 || age > 120) error = 'Age must be between 18 and 120.';
        }
        break;
      default:
        break;
    }

    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Validate field on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  // Update form data and clear errors on change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setGeneralError(null); // Clear the general error
  };

  // Checks if the form is valid. Ensures all fields are valid and filled. Ensures no email validation is in progress.
  const isFormValid = () => {
    return Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value.trim() !== '') && !isCheckingEmail;
  };

  return (
    <div className={styles.auth}>
      <h2>Register</h2>

      <Form method="post" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.firstName && <p className={styles.error}>{fieldErrors.firstName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.lastName && <p className={styles.error}>{fieldErrors.lastName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {isCheckingEmail && <p className={styles.duplicateEmail}>Checking email availability...</p>}
          {(fieldErrors.email || actionData?.errors?.email) && <p className={styles.error}>{fieldErrors.email || actionData.errors.email}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.password && <p className={styles.error}>{fieldErrors.password}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.confirmPassword && <p className={styles.error}>{fieldErrors.confirmPassword}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="birthDate">Birth Date:</label>
            <input type="date" id="birthDate" name="birthDate" value={formData.birthDate} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.birthDate && <p className={styles.error}>{fieldErrors.birthDate}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        <button type="submit" disabled={!isFormValid() || isCheckingEmail}>
          Register
        </button>
      </Form>
    </div>
  );
};

export default Register;
