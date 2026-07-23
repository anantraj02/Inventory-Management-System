import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store } from './redux/store';
import AppRoutes from './routes';
import { setInitialized } from './redux/authSlice';
import API from './services/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const autoAuthenticate = async () => {
      try {
        // Attempt to refresh access token using HTTP-only cookie
        const res = await API.post('/auth/refresh');
        if (res.data.success) {
          dispatch(setInitialized({
            accessToken: res.data.accessToken,
            user: res.data.user
          }));
        } else {
          dispatch(setInitialized(null));
        }
      } catch (err) {
        // Safe to ignore on startup; user just needs to log in
        dispatch(setInitialized(null));
      }
    };

    autoAuthenticate();
  }, [dispatch]);

  return (
    <>
      <AppRoutes />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
