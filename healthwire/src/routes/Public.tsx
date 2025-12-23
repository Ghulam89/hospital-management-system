import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
interface RootState {
  authReducer: {
    userToken: string | null;
  };
}

interface PublicProps {
  children: React.ReactNode;
}

const Public = ({ children }: PublicProps) => {
  const userToken = localStorage.getItem('userToken');
  return userToken ? <Navigate to="/dashboard" /> : <>{children}</>;
}

export default Public;
