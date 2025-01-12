import { collection, doc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Function to handle the complete removal of a user and their related data
const handleRemoveUser = async (userId, setUsers) => {
  try {
    // 1. Delete the user document from the 'users' collection
    await deleteDoc(doc(db, 'users', userId));

    // 2. Delete all messages sent by this user
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(messagesRef, where('senderId', '==', userId)); // Query messages by user ID
    const messagesSnap = await getDocs(messagesQuery); // Fetch matching messages
    const messageDeletePromises = messagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id))); // Create delete operations for each message
    await Promise.all(messageDeletePromises); // Wait for all delete operations to complete

    // 3. Fetch all flats created by the user
    const flatsRef = collection(db, 'flats');
    const flatsQuery = query(flatsRef, where('ownerID', '==', userId)); // Query flats by owner ID
    const flatsSnap = await getDocs(flatsQuery); // Fetch matching flats

    // 4. For each flat, delete all associated messages
    const flatIds = flatsSnap.docs.map((flatDoc) => flatDoc.id);
    for (const flatId of flatIds) {
      const flatMessagesQuery = query(messagesRef, where('flatID', '==', flatId)); // Query messages by flat ID
      const flatMessagesSnap = await getDocs(flatMessagesQuery); // Fetch matching messages
      const flatMessageDeletePromises = flatMessagesSnap.docs.map((msgDoc) => deleteDoc(doc(db, 'messages', msgDoc.id))); // Create delete operations for each message
      await Promise.all(flatMessageDeletePromises); // Wait for all delete operations to complete
    }

    // 5. Delete all flats created by the user after associated messages are deleted
    const flatDeletePromises = flatsSnap.docs.map((flatDoc) => deleteDoc(doc(db, 'flats', flatDoc.id))); // Create delete operations for each flat
    await Promise.all(flatDeletePromises); // Wait for all delete operations to complete

    // 6. Update local state to remove this user from the UI
    setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId)); // Remove the user from state
  } catch (error) {
    // Log any errors and show an alert if the process fails
    console.error('Error removing user:', error);
    alert('Failed to remove user.');
  }
};

export default handleRemoveUser;
