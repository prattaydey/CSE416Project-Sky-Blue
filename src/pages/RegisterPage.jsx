import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RegisterForm } from "../components/RegisterForm";
import { useAuth } from "../hooks/useAuth";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <h1>DraftKit</h1>
        <p className="subtitle">Fantasy Baseball Draft Assistant</p>
        {location.state?.message && (
          <div className="success-message">{location.state.message}</div>
        )}
        <RegisterForm />
        <div className="register-footer">
          <p>
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="link-button"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
