import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { canAccessPath, getStoredUserForPermissions } from "../utils/permissions";

interface PrivateProps {
  children: ReactNode;
}

const Private = ({ children }: PrivateProps) => {
  const userToken = localStorage.getItem('userToken');
  const location = useLocation();
  const userData = getStoredUserForPermissions();

  if (!userToken) {
    return <Navigate to="/auth/admin-login" />;
  }
  if (!canAccessPath(userData, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default Private;