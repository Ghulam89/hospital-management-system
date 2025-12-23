import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ReactNode, useEffect } from "react";

interface RootState {
  authReducer: {
    userToken: string | null;
    socialData: any;
  };
}

interface PrivateProps {
  children: ReactNode;
}

const Private = ({ children }: PrivateProps) => {
  const userToken = localStorage.getItem('userToken');
 
  useEffect(() => {
    console.log(userToken, "userToken");
  }, [userToken]);

  if (!userToken) {
    return <Navigate to="/auth/admin-login" />;
  }

  return <>{children}</>;
};

export default Private;