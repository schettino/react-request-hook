import {request} from './react-request-hook';

export type User = {
  id: number;
  first_name: string;
};

type GetUsersResponse = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: User[];
};

const api = {
  getUsers: (page: number = 1) => {
    return request<GetUsersResponse>({
      method: 'GET',
      url: `/users?page=${page}`,
    });
  },

  searchUser: (searchText: string) => {
    return request({
      method: 'GET',
      baseURL: 'https://5c564f1ed293090014c0ee3e.mockapi.io/api/v1',
      url: `/users?filter=${searchText}&limit=10`,
    });
  },
};

export default api;
