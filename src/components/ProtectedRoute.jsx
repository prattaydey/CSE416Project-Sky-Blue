import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute({ children }) {
  const { user, loading, isLoading } = useAuth();
  const authLoading = typeof isLoading === "boolean" ? isLoading : loading;

  if (authLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
