import axios from "axios";

export const mockCategoryApi = (categories = []) => {
  return axios.get.mockResolvedValue({
    data: {
      category: categories,
    },
  });
};