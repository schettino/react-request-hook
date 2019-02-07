import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {RequestProvider} from './react-request-hook';
import axios from 'axios';
import Pagination from './components/Paginated';

const axiosInstance = axios.create({
  baseURL: 'https://reqres.in/api',
});

ReactDOM.render(
  <RequestProvider value={axiosInstance}>
    <Pagination />
  </RequestProvider>,
  document.getElementById('root'),
);
