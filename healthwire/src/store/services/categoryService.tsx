import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
interface Category {
  id: string;
  name: string;
}

interface CreateCategory {
  name: string;
}

interface UpdateCategory {
  id: string;
  name: string;
}

const categoryService = createApi({
  reducerPath: "category",
  tagTypes: ["categories"],
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api/",
    prepareHeaders: (headers, { getState }) => {
      const reducers = getState();
      const token = reducers?.authReducer?.adminToken;
      console.log(token);
      headers.set("authorization", token ? `Bearer ${token}` : "");
      return headers;
    },
  }),
  endpoints: (builder) => {
    return {
      // Create a new category
      create: builder.mutation<void, CreateCategory>({
        query: (name) => {
          return {
            url: "create-category",
            method: "POST",
            body: name,
          };
        },
        invalidatesTags: ["categories"],
      }),

      // Update an existing category
      updateCategory: builder.mutation<void, UpdateCategory>({
        query: (data) => {
          return {
            url: `update-category/${data.id}`,
            method: "PUT",
            body: { name: data.name },
          };
        },
        invalidatesTags: ["categories"],
      }),

      // Delete a category
      deleteCategory: builder.mutation<void, string>({
        query: (id) => {
          return {
            url: `delete-category/${id}`,
            method: "DELETE",
          };
        },
        invalidatesTags: ["categories"],
      }),

      // Get categories with pagination
      get: builder.query<Category[], number>({
        query: (page) => {
          return {
            url: `categories/${page}`,
            method: "GET",
          };
        },
        providesTags: ["categories"],
      }),

      // Fetch a specific category
      fetchCategory: builder.query<Category, string>({
        query: (id) => {
          return {
            url: `fetch-category/${id}`,
            method: "GET",
          };
        },
        providesTags: ["categories"],
      }),

      // Get all categories
      allCategories: builder.query<Category[], void>({
        query: () => {
          return {
            url: "allcategories",
            method: "GET",
          };
        },
      }),

      // Get random categories
      randomCategories: builder.query<Category[], void>({
        query: () => {
          return {
            url: "random-categories",
            method: "GET",
          };
        },
      }),
    };
  },
});

export const {
  useCreateMutation,
  useGetQuery,
  useFetchCategoryQuery,
  useAllCategoriesQuery,
  useRandomCategoriesQuery,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryService;

export default categoryService;
