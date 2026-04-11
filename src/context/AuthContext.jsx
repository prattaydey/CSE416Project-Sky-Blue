import React, { createContext, useState, useEffect } from "react";
import { verifyToken } from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const decoded = await verifyToken(token);
          setUser(decoded);
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        localStorage.removeItem("authToken");
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("authToken", token);
    setUser(userData);
    setError(null);
  };

  const updateUser = (updatedValues) => {
    setUser((prevUser) => (prevUser ? { ...prevUser, ...updatedValues } : prevUser));
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    setError(null);
  };

  const getToken = () => {
    return localStorage.getItem("authToken");
  };

  const value = {
    user,
    loading,
    error,
    login,
    updateUser,
    logout,
    getToken,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
