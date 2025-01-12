import React from 'react';
import { UserProvider } from './context/UserContext';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout/AppLayout';
import Login, { loginAction } from './components/Auth/Login';
import Register, { registerAction } from './components/Auth/Register';
import Home, { homeLoader } from './components/Pages/Flats/Home/Home';
import NewFlat, { newFlatAction } from './components/Pages/Flats/NewFlat/NewFlat';
import ViewFlat, { viewFlatLoader } from './components/Pages/Flats/ViewFlat/ViewFlat';
import Messages, { messagesLoader, messagesAction } from './components/Pages/Flats/Messages/Messages';
import EditFlat, { editFlatLoader, editFlatAction } from './components/Pages/Flats/EditFlat/EditFlat';
import MyProfile, { myProfileAction } from './components/User/MyProfile/MyProfile';
import MyFlats, { myFlatsLoader } from './components/User/MyFlats/MyFlats';
import Favorites, { favoritesLoader } from './components/User/Favorites/Favorites';
import AllUsers, { allUsersLoader } from './components/Pages/Admin/AllUsers/AllUsers';
import ErrorPage from './components/ErrorPage/ErrorPage';
import ProtectedRoute from './components/Shared/ProtectedRoute/ProtectedRoute';

// Router configuration
const router = createBrowserRouter([
  {
    // Main application layout
    path: '/',
    element: <AppLayout />,
    children: [
      {
        // Home page route
        index: true,
        element: <Home />,
        loader: homeLoader,
      },
      {
        // Login page route
        path: 'login',
        element: <Login />,
        action: loginAction,
      },
      {
        // Registration page route
        path: 'register',
        element: <Register />,
        action: registerAction,
      },
      {
        // MyFlats section under protected routes
        path: 'myFlats',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <MyFlats />,
            loader: myFlatsLoader,
          },
        ],
      },
      {
        // Favorites section under protected routes
        path: 'favorites',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Favorites />,
            loader: favoritesLoader,
          },
        ],
      },
      {
        // Routes related to flats (new, edit, view)
        path: 'flats',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'new',
            element: <NewFlat />,
            action: newFlatAction,
          },
          {
            path: 'edit/:flatID',
            element: <EditFlat />,
            loader: editFlatLoader,
            action: editFlatAction,
          },
          {
            path: 'view/:flatID',
            element: <ViewFlat />,
            loader: viewFlatLoader,
            errorElement: <ErrorPage />,
            children: [
              {
                path: 'messages',
                element: <Messages />,
                loader: messagesLoader,
                action: messagesAction,
              },
            ],
          },
        ],
      },
      {
        // User profile page route
        path: 'users/:userID',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <MyProfile />,
            action: myProfileAction,
          },
        ],
      },
      {
        // Admin-specific routes
        path: 'admin',
        element: <ProtectedRoute adminOnly={true} />,
        children: [
          {
            path: 'all-users',
            element: <AllUsers />,
            loader: allUsersLoader,
          },
        ],
      },
      {
        // Catch-all for undefined routes
        path: '*',
        element: <ErrorPage />,
      },
    ],
  },
]);

// Main application entry point
const App = () => (
  <UserProvider>
    <RouterProvider router={router} />
  </UserProvider>
);

export default App;
