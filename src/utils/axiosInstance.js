import axios from "axios";
import useAuthStore from "../store/authStore";

const baseURL = "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 10000, // Optional timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add authorization header
axiosInstance.interceptors.request.use(
  (config) => {
    const { user } = useAuthStore.getState(); // Get user from authStore
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    //  Handle different error scenarios (e.g., token expiration, server errors)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Error:", error.response.data);
      //  You might want to show a generic error message to the user here
      //  using a toast or a global error state.
    } else if (error.request) {
      // The request was made but no response was received
      console.error("API Error:", "No response from server");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
