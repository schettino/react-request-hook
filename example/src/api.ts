import {request} from './react-request-hook';

export type User = {
  id: number;
  createdAt: string;
  avatar: string;
  name: string;
};

const api = {
  getUsers: (page: number = 1) => {
    return request<User[]>({
      method: 'GET',
      url: `/users?limit=10&page=${page}`,
    });
  },

  searchUser: (searchText: string) => {
    return request<User[]>({
      method: 'GET',
      url: `/users?filter=${searchText}&limit=10`,
    });
  },
};

export default api;
