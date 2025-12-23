import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode, JwtPayload } from "jwt-decode";
function verifyToken(keyName: string): string | null {
  const storage = localStorage.getItem(keyName);
  if (storage) {
    const decodeToken = jwtDecode<JwtPayload>(storage);
    const expiresIn = new Date((decodeToken.exp || 0) * 1000);
    if (new Date() > expiresIn) {
      localStorage.removeItem(keyName);
      return null;
    } else {
      return storage;
    }
  }
  return null;
}

// Interfaces for the auth state
interface AuthState {
  userToken: string | null;
  user: Record<string, any> | null;
  socialData: Record<string, any> | null;
}

// Get the initial user token and decoded user
const customerToken = localStorage.getItem("userToken");
const initialUser = customerToken ? jwtDecode<Record<string, any>>(customerToken) : null;
const initialSocialData = JSON.parse(localStorage.getItem("socialData") || "null");

// Initial state
const initialState: AuthState = {
  userToken: verifyToken("userToken"),
  user: initialUser,
  socialData: initialSocialData, 
};

// Create the auth slice
const authReducer = createSlice({
  name: "authReducer",
  initialState,
  reducers: {

    setUserToken: (state, action: PayloadAction<string>) => {
      state.userToken = action.payload;
      state.user = jwtDecode<Record<string, any>>(action.payload);
      
    },
    
     setSocialData: (state, action: PayloadAction<Record<string, any>>) => {
      state.socialData = action.payload;
      localStorage.setItem("socialData", JSON.stringify(action.payload));
    },

    logout: (state, action: PayloadAction<"userToken">) => {
      localStorage.removeItem(action.payload);
      if (action.payload === "userToken") {
        state.userToken = null;
        state.user = null;
      } else if (action.payload === "socialData") {
        state.socialData = null;
      }
    },
  },
});

// Export actions and reducer
export const { setUserToken, logout,setSocialData} = authReducer.actions;
export default authReducer.reducer;
