import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Base_url } from "../../utils/Base_url";
interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface UpdatePackage {
  id: string;
  name: string;
  category: string;
  title: string;
  subTitle: string;
  price: number;
  assetPerMonth: number;
  featureHeading: string;
  users: number;
  features: string[];
  takedowns: number;
  support: boolean;
}

const authService = createApi({
  reducerPath: "auth",
  baseQuery: fetchBaseQuery({
    baseUrl:`${Base_url}/user/`,
  }),
  endpoints: (builder) => {
    return {
      authLogin: builder.mutation<AuthResponse, LoginData>({
        query: (loginData) => {
          return {
            url: "login",
            method: "POST",
            body: loginData,
          };
        },
      }),
      upgradePackage: builder.mutation<void, { id: string; newPlan: string }>({
        query: (data) => ({
          url: `upgradePlan/${data.id}`,
          method: 'POST',
          body: { newPlan: data.newPlan },
        }),
      }), 
      userRegister: builder.mutation<AuthResponse, RegisterData>({
        query: (data) => {
          return {
            url: "/register",
            method: "POST",
            body: data,
          };
        },
      }),
      userLogin: builder.mutation<AuthResponse, LoginData>({
        query: (loginData) => {
          return {
            url: "/login",
            method: "POST",
            body: loginData,
          };
        },
      }),
    };
  },
});

export const {
  useAuthLoginMutation,
  useUpgradePackageMutation,
  useUserRegisterMutation,
  useUserLoginMutation,
} = authService;

export default authService;
