import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define the shape of the state
interface GlobalState {
  success: string;
  searchBar: boolean;
}

const initialState: GlobalState = {
  success: "",
  searchBar: false,
};

const globalReducer = createSlice({
  name: "global",
  initialState,
  reducers: {
    setSuccess: (state, action: PayloadAction<string>) => {
      console.log(action);
      state.success = action.payload;
    },
    clearMessage: (state) => {
      state.success = "";
    },
    toggleSearchBar: (state) => {
      state.searchBar = !state.searchBar;
    },
  },
});

export const { setSuccess, clearMessage, toggleSearchBar } = globalReducer.actions;
export default globalReducer.reducer;
