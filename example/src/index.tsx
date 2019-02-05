import * as React from 'react';
import * as ReactDOM from 'react-dom';
// import App from './App';
import {RequestProvider} from './react-request-hook';
import axios from 'axios';
import SearchUser, {SearchUserOptmized} from './components/SearchUser';
import Pagination from './components/Paginated';

const axiosInstance = axios.create({
  baseURL: 'https://reqres.in/api',
});

// axiosInstance.interceptors.request.use(config => {
//   return new Promise(resolve => {
//     setTimeout(() => {
//       resolve(config);
//       console.count('[REQUEST CALLED]');
//     }, 6000);
//   });
// });

ReactDOM.render(
  <RequestProvider value={axiosInstance}>
    <SearchUser />
    <SearchUserOptmized />
    <Pagination />
  </RequestProvider>,
  document.getElementById('root'),
);
