import { configureStore } from "@reduxjs/toolkit";
import authService from "./services/authService";
import categoryService from "./services/categoryService";
import authReducer from "./reducers/authReducer";
import socialReducer from "./reducers/socialReducer";
import globalReducer from "./reducers/globalReducer";
const Store = configureStore({
  reducer: {
    [authService.reducerPath]: authService.reducer,
    [categoryService.reducerPath]: categoryService.reducer,
    authReducer: authReducer,
    socialReducer: socialReducer,
    globalReducer: globalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      categoryService.middleware,
    ]),
});
export default Store;
