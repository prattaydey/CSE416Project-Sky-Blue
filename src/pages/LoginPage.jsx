import React from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>DraftKit</h1>
        <p className="subtitle">Fantasy Baseball Draft Assistant</p>
        <LoginForm />
        <div className="login-footer">
          <p>
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="link-button"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
