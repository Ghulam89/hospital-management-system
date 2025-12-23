import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { jwtDecode, JwtPayload } from "jwt-decode";
// function verifyToken(keyName: string): string | null {
//     const storage = localStorage.getItem(keyName);
//     if (storage) {
//         const decodeToken = jwtDecode<JwtPayload>(storage);
//         const expiresIn = new Date((decodeToken.exp || 0) * 1000);
//         if (new Date() > expiresIn) {
//             localStorage.removeItem(keyName);
//             return null;
//         } else {
//             return storage;
//         }
//     }
//     return null;
// }

// Interfaces for the auth state
interface AuthState {

    // facebookToken: string | null;
    // user: Record<string, any> | null;
}

// Get the initial user token and decoded user
const customerToken = localStorage.getItem("facebookToken");
// const initialUser = customerToken ? jwtDecode<Record<string, any>>(customerToken) : null;

// Initial state
const initialState: AuthState = {
    // facebookToken: verifyToken("facebookToken"),
    // user: initialUser,
};

// Create the auth slice
const socialReducer = createSlice({
    name: "socialReducer",
    initialState,
    reducers: {

        setSocialToken: (state, action: PayloadAction<string>) => {
            // state.facebookToken = action.payload;
            // state.user = jwtDecode<Record<string, any>>(action.payload);

        },

        logout: (state, action: PayloadAction<"facebookToken">) => {
            localStorage.removeItem(action.payload);
            if (action.payload === "facebookToken") {
                // state.facebookToken = null;
                // state.user = null;
            } else if (action.payload === "socialData") {

            }
        },
    },
});

// Export actions and reducer
export const { setSocialToken, logout } = socialReducer.actions;
export default socialReducer.reducer;
