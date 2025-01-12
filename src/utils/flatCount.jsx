import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Function to count the number of flats owned by a specific user
const flatCount = async (ownerId) => {
  const flatsRef = collection(db, 'flats');

  // Create a query to find flats where the 'ownerID' matches the provided ownerId
  const flatsQuery = query(flatsRef, where('ownerID', '==', ownerId));

  // Execute the query and retrieve the matching documents
  const flatsSnapshot = await getDocs(flatsQuery);

  // Return the total number of documents (flats) found in the snapshot
  return flatsSnapshot.size;
};

export default flatCount;
