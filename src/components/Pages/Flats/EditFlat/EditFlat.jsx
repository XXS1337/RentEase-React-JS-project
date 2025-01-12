import React, { useState, useEffect } from 'react';
import { useActionData, Form, useNavigate, useLoaderData } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import { normalizeDate, getOneYearFromToday } from '../../../../utils/dateUtils';
import styles from './EditFlat.module.css';

// Loader to fetch flat data for editing
export const editFlatLoader = async ({ params }) => {
  const flatID = params.flatID; // Extract flat ID from route params

  try {
    const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch flat data from Firestore
    if (flatDoc.exists()) {
      return { ...flatDoc.data(), id: flatID }; // Return the flat data with its ID
    } else {
      throw new Error('Flat not found'); // Handle case where flat doesn't exist
    }
  } catch (error) {
    console.error('Error fetching flat data:', error); // Log error
    throw new Response('Failed to fetch flat data.', { status: 404 });
  }
};

// Action to handle flat data updates
export const editFlatAction = async ({ request, params }) => {
  const formData = await request.formData(); // Parse form data
  const flatID = params.flatID; // Extract flat ID from route params

  const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch the current flat data
  if (!flatDoc.exists()) {
    throw new Error('Flat not found'); // Handle missing flat
  }
  const originalFlatData = flatDoc.data(); // Store original flat data for validation

  // Extract form data fields
  const adTitle = formData.get('adTitle');
  const city = formData.get('city');
  const streetName = formData.get('streetName');
  const streetNumber = formData.get('streetNumber');
  const areaSize = formData.get('areaSize');
  const hasAC = formData.get('hasAC') === 'on'; // Convert checkbox value to boolean
  const yearBuilt = formData.get('yearBuilt');
  const rentPrice = formData.get('rentPrice');
  const dateAvailable = formData.get('dateAvailable');
  const imageFile = formData.get('image'); // Handle optional image file upload

  const errors = {}; // Object to store validation errors

  // Validate input fields
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
    const originalDate = new Date(originalFlatData.dateAvailable);
    originalDate.setHours(0, 0, 0, 0); // Normalize the original date to midnight
    const selectedDate = new Date(dateAvailable);
    selectedDate.setHours(0, 0, 0, 0); // Normalize the selected date to midnight
    const oneYearFromToday = getOneYearFromToday(today);

    // Logic: If originalDate > today, allow date to be set from today to one year from today
    if (originalDate > today) {
      if (selectedDate < today || selectedDate > oneYearFromToday) {
        errors.dateAvailable = `Date available must be between today (${today.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        })}) and one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        })}).`;
      }
    } else if (selectedDate < originalDate || selectedDate > oneYearFromToday) {
      errors.dateAvailable = `Date available must be between the original date (${originalDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}) and one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })}).`;
    }
  }
  if (imageFile && imageFile.name && typeof imageFile === 'object') {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validImageTypes.includes(imageFile.type)) {
      errors.image = 'Only JPG, PNG, and GIF images are allowed.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors }; // Return validation errors
  }

  try {
    // Create an object with the updated flat data to be saved in Firestore
    const updatedData = {
      adTitle,
      city,
      streetName,
      streetNumber: Number(streetNumber),
      areaSize: Number(areaSize),
      hasAC,
      yearBuilt: Number(yearBuilt),
      rentPrice: Number(rentPrice),
      dateAvailable,
    };

    // Additional logic to handle the optional image upload
    if (imageFile && imageFile.name) {
      updatedData.image = imageFile.name; // Include new image file name if uploaded
    }

    await updateDoc(doc(db, 'flats', flatID), updatedData); // Update flat data in Firestore
    return { success: true }; // Indicate success
  } catch (error) {
    console.error('Error updating flat:', error); // Log error
    return { errors: { general: 'Failed to update flat. Please try again.' } }; // Return general error
  }
};

// Component to handle the editing of a flat.
const EditFlat = () => {
  const flatData = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(flatData || {}); // State to store form data
  const [originalData, setOriginalData] = useState(flatData || {}); // State to store original flat data for comparison
  const [fieldErrors, setFieldErrors] = useState({}); // State to track field-level errors
  const [generalError, setGeneralError] = useState(null); // General error state

  // Update form data when the loader data changes
  useEffect(() => {
    if (flatData) {
      setFormData(flatData);
      setOriginalData(flatData);
    }
  }, [flatData]);

  // Redirect to the user's flats page on successful update
  useEffect(() => {
    if (actionData?.success) {
      alert('Flat updated successfully!');
      navigate('/myFlats');
    }

    if (actionData?.errors?.general) {
      setGeneralError(actionData.errors.general); // Set general error
    }
  }, [actionData, navigate]);

  // Validate fields on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: null })); // Clear error for the field
    setGeneralError(null); // Clear general error
  };

  // Validate a single field
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
          const originalDate = normalizeDate(originalData.dateAvailable);
          const selectedDate = normalizeDate(value);
          const today = normalizeDate(new Date());
          const oneYearFromToday = getOneYearFromToday(today);

          // Logic: If originalDate > today, allow date to be set from today to one year from today
          if (originalDate > today) {
            if (selectedDate < today || selectedDate > oneYearFromToday) {
              error = `Date available must be between today (${today.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })}) and one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })}).`;
            }
          } else if (selectedDate < originalDate || selectedDate > oneYearFromToday) {
            error = `Date available must be between the original date (${originalDate.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}) and one year from today (${oneYearFromToday.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })}).`;
          }
        }
        break;
      case 'image':
        // Validate image file upload
        if (!originalData.image && !value) {
          error = 'Image file is required.';
        } else if (value && typeof value === 'object' && !value.name) {
          error = 'Please upload a valid image file.';
        }
        break;
      default:
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error })); // Update errors
  };

  // Check if the form is valid
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error); // Check for errors

    const hasChanges =
      originalData &&
      (formData.adTitle !== originalData.adTitle ||
        formData.city !== originalData.city ||
        formData.streetName !== originalData.streetName ||
        Number(formData.streetNumber) !== originalData.streetNumber ||
        Number(formData.areaSize) !== originalData.areaSize ||
        Number(formData.yearBuilt) !== originalData.yearBuilt ||
        Number(formData.rentPrice) !== originalData.rentPrice ||
        formData.dateAvailable !== originalData.dateAvailable ||
        formData.hasAC !== originalData.hasAC ||
        (formData.image && formData.image.name)); // Check if a new image is selected

    return !hasErrors && hasChanges; // Form is valid if no errors and changes exist
  };

  return (
    <div className={styles.editFlat}>
      <h2>Edit Flat</h2>
      {/* Add encType in order to send new file name */}
      <Form method="post" className={styles.form} encType="multipart/form-data">
        {/* Ad Title */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="adTitle">Ad Title:</label>
            <input id="adTitle" name="adTitle" type="text" value={formData.adTitle || ''} minLength="5" maxLength="60" onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.adTitle && <p className={styles.error}>{fieldErrors.adTitle}</p>}
        </div>

        {/* City */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="city">City:</label>
            <input id="city" name="city" type="text" value={formData.city || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.city && <p className={styles.error}>{fieldErrors.city}</p>}
        </div>

        {/* Street Name */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetName">Street Name:</label>
            <input id="streetName" name="streetName" type="text" value={formData.streetName || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetName && <p className={styles.error}>{fieldErrors.streetName}</p>}
        </div>

        {/* Street Number */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="streetNumber">Street Number:</label>
            <input id="streetNumber" name="streetNumber" type="number" value={formData.streetNumber || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.streetNumber && <p className={styles.error}>{fieldErrors.streetNumber}</p>}
        </div>

        {/* Area Size */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="areaSize">Area Size (m²):</label>
            <input id="areaSize" name="areaSize" type="number" value={formData.areaSize || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.areaSize && <p className={styles.error}>{fieldErrors.areaSize}</p>}
        </div>

        {/* Year Built */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="yearBuilt">Year Built:</label>
            <input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.yearBuilt && <p className={styles.error}>{fieldErrors.yearBuilt}</p>}
        </div>

        {/* Rent Price */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="rentPrice">Rent Price (€):</label>
            <input id="rentPrice" name="rentPrice" type="number" value={formData.rentPrice || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.rentPrice && <p className={styles.error}>{fieldErrors.rentPrice}</p>}
        </div>

        {/* Date Available */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="dateAvailable">Date Available:</label>
            <input id="dateAvailable" name="dateAvailable" type="date" value={formData.dateAvailable || ''} onChange={handleChange} onBlur={handleBlur} required />
          </div>
          {fieldErrors.dateAvailable && <p className={styles.error}>{fieldErrors.dateAvailable}</p>}
        </div>

        {/* Has AC */}
        <div className={styles.formGroup}>
          <div className={`${styles.inputContainer} ${styles.inputContainerCheckbox}`}>
            <label htmlFor="hasAC">Has AC:</label>
            <input id="hasAC" name="hasAC" type="checkbox" checked={formData.hasAC || false} onChange={handleChange} />
          </div>
        </div>

        {/* Flat Image */}
        <div className={styles.formGroup}>
          <div className={styles.inputContainer}>
            <label htmlFor="image">Flat Image:</label>
            <input id="image" name="image" type="file" accept="image/*" onChange={handleChange} />
          </div>
          {/* Preview New Image */}
          {formData.image && typeof formData.image === 'object' && (
            <div className={styles.newImagePreview}>
              <p>New Image Preview:</p>
              <img src={URL.createObjectURL(formData.image)} alt="New Flat" style={{ width: '200px' }} />
            </div>
          )}
          {fieldErrors.image && <p className={styles.error}>{fieldErrors.image}</p>}
        </div>

        {/*For General Errors */}
        {generalError && <p className={styles.error}>{generalError}</p>}

        {/* Submit and Back Buttons */}
        <button type="submit" className={styles.saveButton} disabled={!isFormValid()}>
          Save
        </button>

        <button type="button" className={styles.backButton} onClick={() => navigate('/myFlats')}>
          Back
        </button>
      </Form>
    </div>
  );
};

export default EditFlat;
