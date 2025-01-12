import React, { useState, useEffect } from 'react';
import { useActionData, Form, useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { normalizeDate, getOneYearFromToday } from '../../../../utils/dateUtils';
import styles from './NewFlat.module.css';

// Action to handle adding a new flat
export const newFlatAction = async ({ request }) => {
  const formData = await request.formData(); // Parse form data from the request

  // Extract and process form fields
  const adTitle = formData.get('adTitle');
  const city = formData.get('city');
  const streetName = formData.get('streetName');
  const streetNumber = formData.get('streetNumber');
  const areaSize = formData.get('areaSize');
  const hasAC = formData.get('hasAC') === 'on'; // Convert checkbox value to boolean
  const yearBuilt = formData.get('yearBuilt');
  const rentPrice = formData.get('rentPrice');
  const dateAvailable = formData.get('dateAvailable');
  const imageFile = formData.get('image'); // Image file upload

  const errors = {}; // Object to hold validation errors

  // Validate each field
  if (!adTitle || adTitle.length < 5 || adTitle.length > 60) {
    errors.adTitle = 'Ad title must be between 5 and 60 characters.';
  }
  if (!city || city.length < 2) {
    errors.city = 'City name must be at least 2 characters.';
  }
  if (!streetName || streetName.length < 2) {
    errors.streetName = 'Street name must be at least 2 characters.';
  }
  if (!streetNumber || isNaN(streetNumber)) {
    errors.streetNumber = 'Street number must be greater than zero.';
  }
  if (!areaSize || isNaN(areaSize) || areaSize <= 0) {
    errors.areaSize = 'Area size must be a valid positive number.';
  }
  if (!yearBuilt || isNaN(yearBuilt) || yearBuilt < 1900 || yearBuilt > new Date().getFullYear()) {
    errors.yearBuilt = 'Year built must be between 1900 and the current year.';
  }
  if (!rentPrice || isNaN(rentPrice) || rentPrice <= 0) {
    errors.rentPrice = 'Rent price must be greater than zero.';
  }
  if (!dateAvailable) {
    errors.dateAvailable = 'Date available is required.';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight
    const selectedDate = new Date(dateAvailable);
    selectedDate.setHours(0, 0, 0, 0); // Normalize the selected date to midnight
    const oneYearFromToday = getOneYearFromToday(today);

    if (selectedDate < today || selectedDate > oneYearFromToday) {
      errors.dateAvailable = `Date available must be today (${today.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}) or within one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}).`;
    }
  }
  if (!imageFile || !imageFile.name) {
    errors.image = 'Image file is required.';
  }

  // If validation errors exist, return them
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    const userID = localStorage.getItem('loggedInUser'); // Get the logged-in user ID

    const imagePath = imageFile.name; // Store the image file name

    // Create flat data object
    const flatData = {
      adTitle,
      city,
      streetName,
      streetNumber: Number(streetNumber),
      areaSize: Number(areaSize),
      hasAC,
      yearBuilt: Number(yearBuilt),
      rentPrice: Number(rentPrice),
      dateAvailable,
      image: imagePath, // Save the file name
      createdAt: Date.now(), // Current timestamp
      ownerID: userID, // Assign the flat to the logged-in user
    };

    // Save the flat data in Firestore
    await addDoc(collection(db, 'flats'), flatData);

    // Returning success to allow navigation in the component
    return { success: true };
  } catch (error) {
    console.error('Error adding flat:', error);
    return { errors: { general: 'Failed to add flat. Please try again.' } };
  }
};

// Component for adding a new flat
const NewFlat = () => {
  const actionData = useActionData();
  const navigate = useNavigate();
  const [formSubmitted, setFormSubmitted] = useState(false); // State to prevent duplicate submissions
  const [fieldErrors, setFieldErrors] = useState({}); // State for field-specific errors
  const [formData, setFormData] = useState({
    adTitle: '',
    city: '',
    streetName: '',
    streetNumber: '',
    areaSize: '',
    yearBuilt: '',
    rentPrice: '',
    dateAvailable: '',
    image: null,
    hasAC: false,
  }); // State for form data
  const [generalError, setGeneralError] = useState(null); // General error state

  useEffect(() => {
    if (actionData?.success && !formSubmitted) {
      alert('Flat added successfully!'); // Notify user of success
      setFormSubmitted(true);
      navigate('/myFlats'); // Redirect to "My Flats" page
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, formSubmitted, navigate]);

  // Validate fields on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  // Handle input changes and clear field errors
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear field-specific errors
    setGeneralError(null); // Clear the general error
  };

  // Validate individual fields
  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'adTitle':
        if (!value || value.length < 5 || value.length > 60) error = 'Ad title must be between 5 and 60 characters.';
        break;
      case 'city':
        if (!value || value.length < 2) error = 'City name must be at least 2 characters.';
        break;
      case 'streetName':
        if (!value || value.length < 2) error = 'Street name must be at least 2 characters.';
        break;
      case 'streetNumber':
        if (!value || isNaN(value)) error = 'Street number must be a valid number.';
        break;
      case 'areaSize':
        if (!value || isNaN(value) || value <= 0) error = 'Area size must be a valid positive number.';
        break;
      case 'yearBuilt':
        const currentYear = new Date().getFullYear();
        if (!value || isNaN(value) || value < 1900 || value > currentYear) {
          error = 'Year built must be between 1900 and the current year.';
        }
        break;
      case 'rentPrice':
        if (!value || isNaN(value) || value <= 0) error = 'Rent price must be greater than zero.';
        break;
      case 'dateAvailable':
        if (!value) {
          error = 'Date available is required.';
        } else {
          const today = normalizeDate(new Date());
          const selectedDate = normalizeDate(value);
          const oneYearFromToday = getOneYearFromToday(today);

          if (selectedDate < today || selectedDate > oneYearFromToday) {
            error = `Date available must be today (${today.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}) or within one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}).`;
          }
        }
        break;
      case 'image':
        if (!value) error = 'Image file is required.';
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error })); // Update field errors
  };

  // Check if the form is valid
  const isFormValid = () => {
    // Ensure no field errors and all fields are filled
    const isValid = Object.values(fieldErrors).every((error) => !error) && Object.values(formData).every((value) => value !== '' && value !== null);
    return isValid;
  };

  return (
    <div className={styles.newFlat}>
      <h2>Add New Flat</h2>

      <Form method="post" encType="multipart/form-data" className={styles.form}>
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">Ad Title:</label>
            <input id="adTitle" name="adTitle" type="text" minLength="5" maxLength="60" value={formData.adTitle} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">City:</label>
            <input id="city" name="city" type="text" value={formData.city} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">Street Name:</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">Street Number:</label>
            <input id="streetNumber" name="streetNumber" type="number" value={formData.streetNumber} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">Area Size (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">Year Built:</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">Rent Price (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">Date Available:</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.dateAvailable && <p className={styles.error}>{fieldErrors.dateAvailable}</p>}
        </div>

        <div className={styles.formGroup}>
          <div className={`${styles.inputContainer} ${styles.inputContainerCheckbox}`}>
            <label htmlFor="hasAC">Has AC:</label>
            <input type="checkbox" id="hasAC" name="hasAC" checked={formData.hasAC} onChange={handleChange} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="image">Flat Image:</label>
            <input type="file" id="image" name="image" accept="image/*" onChange={handleChange} onBlur={handleBlur} />
          </div>
          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        <button type="submit" className={styles.saveButton} disabled={!isFormValid()}>
          Save
        </button>
      </Form>
    </div>
  );
};

export default NewFlat;
