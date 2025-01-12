import React, { useEffect, useState } from 'react';
import { useLoaderData, useActionData, Form, useSubmit, useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../firebase';
import styles from './Messages.module.css';

// Loader function to fetch messages and determine user permissions
export const messagesLoader = async ({ params }) => {
  const { flatID } = params; // Extract the flat ID from the route params
  const loggedInUserId = localStorage.getItem('loggedInUser'); // Get the logged-in user ID

  try {
    const flatDoc = await getDoc(doc(db, 'flats', flatID)); // Fetch the flat document
    if (!flatDoc.exists()) {
      throw new Error('Flat not found');
    }
    const flatData = flatDoc.data();
    const isOwner = loggedInUserId === flatData.ownerID; // Determine if the user is the flat owner

    // Query messages based on user role (owner sees all, others see only their messages)
    const messagesQuery = isOwner ? query(collection(db, 'messages'), where('flatID', '==', flatID)) : query(collection(db, 'messages'), where('flatID', '==', flatID), where('senderId', '==', loggedInUserId));

    const snapshot = await getDocs(messagesQuery); // Fetch the messages

    let messages = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let creationTime = 'Unknown Time';
        if (data.creationTime) {
          creationTime = data.creationTime.toDate(); // Convert Firestore Timestamp to Date
        }

        // Fetch sender details
        let senderName = 'Unknown User';
        let senderEmail = 'Unknown Email';
        if (data.senderId) {
          const userDocRef = doc(db, 'users', data.senderId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const firstName = userData.firstName || 'Unknown';
            const lastName = userData.lastName || 'User';
            senderName = `${firstName} ${lastName}`;
            senderEmail = userData.email || 'Unknown Email';
          }
        }

        return {
          id: docSnap.id,
          ...data,
          creationTime, // Keep as Date object for sorting
          senderName,
          senderEmail,
        };
      })
    );

    // Sort messages chronologically by creationTime
    messages = messages.sort((a, b) => a.creationTime - b.creationTime);

    // Format creationTime to a readable string for display
    messages = messages.map((msg) => ({
      ...msg,
      creationTime: msg.creationTime.toLocaleString(),
    }));

    return { messages, loggedInUserId, isOwner }; // Return fetched data
  } catch (error) {
    console.error('Error loading messages:', error);
    return { messages: [], loggedInUserId, isOwner: false }; // Return empty data on failure
  }
};

// Action to handle sending a new message
export const messagesAction = async ({ request, params }) => {
  const formData = await request.formData(); // Parse the submitted form data
  const flatID = params.flatID; // Extract the flat ID from route params
  const loggedInUserId = localStorage.getItem('loggedInUser'); // Get the logged-in user ID
  const content = formData.get('messageContent'); // Get the message content

  // Validate message content
  if (!content || !content.trim()) {
    return { error: 'Message content cannot be empty.' };
  }

  try {
    // Create a new message object
    const messageData = {
      flatID,
      senderId: loggedInUserId,
      content: content.trim(),
      creationTime: Timestamp.now(), // Firestore timestamp
    };

    // Save the new message to Firestore and get the document reference
    const docRef = await addDoc(collection(db, 'messages'), messageData);

    // Return success response with the new message data and Firestore-generated ID
    return {
      success: true,
      message: {
        ...messageData,
        id: docRef.id, // Use Firestore's generated ID
      },
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to send the message. Please try again.' };
  }
};

// Messages component to display and send messages
const Messages = () => {
  const { flatID, ownerID } = useOutletContext(); // Get context data (flat and owner IDs)
  const { messages: initialMessages, loggedInUserId } = useLoaderData(); // Load initial messages and user ID
  const actionData = useActionData();
  const [messages, setMessages] = useState(initialMessages || []); // State for messages
  const [newMessage, setNewMessage] = useState(''); // State for the new message input
  const [error, setError] = useState(''); // State for client-side validation errors
  const isOwner = loggedInUserId === ownerID; // Determine if the logged-in user is the owner
  const submit = useSubmit(); // Submit hook for form submission

  const [currentUser, setCurrentUser] = useState(null); // State for current user details

  // Fetch the current user's details
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!loggedInUserId) return; // Early return if no user is logged in
      try {
        const userRef = doc(db, 'users', loggedInUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data()); // Set the current user data
        }
      } catch (err) {
        console.error('Error fetching logged-in user details:', err);
      }
    };

    fetchCurrentUser();
  }, [loggedInUserId]);

  // Handle action data updates (e.g., new messages or errors)
  useEffect(() => {
    if (actionData?.success && actionData.message) {
      const newMsg = {
        ...actionData.message,
        creationTime: new Date().toLocaleString(), // Format creation time
      };
      if (currentUser) {
        const firstName = currentUser.firstName || 'Unknown';
        const lastName = currentUser.lastName || 'User';
        newMsg.senderName = `${firstName} ${lastName}`;
        newMsg.senderEmail = currentUser.email || 'Unknown Email';
      } else {
        newMsg.senderName = 'You'; // Fallback for anonymous sender
        newMsg.senderEmail = '—';
      }
      setMessages((prev) => [...prev, newMsg]); // Add the new message to the list
      setNewMessage(''); // Clear the input field
      setError(''); // Clear validation errors
    } else if (actionData?.error) {
      setError(actionData.error); // Display error message
    }
  }, [actionData, currentUser]);

  // Handle changes to the textarea value
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value); // Update the new message state
    if (value.trim() && error) {
      setError(''); // Clear errors if input is valid
    }
  };

  // Validate message content on blur
  const handleBlur = () => {
    if (!newMessage.trim()) {
      setError('Message content can’t be an empty string.');
    }
  };

  return (
    <div className={styles.messages}>
      <h3>Messages</h3>

      {/* Message list */}
      <div className={styles.messageList}>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={styles.message}>
              <p>
                <strong>From:</strong> {msg.senderName && msg.senderEmail ? `${msg.senderName} (${msg.senderEmail})` : msg.senderId === loggedInUserId ? 'You' : msg.senderId}
              </p>
              <p>
                <strong>Sent:</strong> {msg.creationTime}
              </p>
              <p>
                <strong>Message:</strong> {msg.content}
              </p>
            </div>
          ))
        ) : (
          <p>No messages to display.</p>
        )}
      </div>

      {/* New message form (only for non-owners) */}
      {!isOwner && (
        <Form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newMessage.trim()) {
              setError('Message content can’t be an empty string.');
              return;
            }
            const formData = new FormData(e.target);
            submit(formData, { method: 'post' });
          }}
          className={styles.newMessage}
        >
          <textarea name="messageContent" placeholder="Write your message here..." value={newMessage} onChange={handleInputChange} onBlur={handleBlur} className={error ? styles.errorInput : ''} />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={!newMessage.trim()}>
            Send Message
          </button>
        </Form>
      )}
    </div>
  );
};

export default Messages;
