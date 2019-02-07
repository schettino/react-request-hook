import React, {useEffect} from 'react';
import axios from 'axios';
import {RequestProvider} from './react-request-hook';
import {useDispatch} from 'redux-react-hook';

const axiosInstance = axios.create({
  baseURL: 'https://reqres.in/api',
  params: {},
});

export const Sandbox: React.FC<{name: string}> = props => {
  const dispatch = useDispatch();
  const log = (method: string, status: string) =>
    dispatch({
      type: `@${props.name}/${method.toUpperCase()}/${status}`,
    });

  useEffect(() => {
    axiosInstance.interceptors.request.use(config => {
      log(config.method!, 'START');
      return config;
    });

    axiosInstance.interceptors.response.use(
      response => {
        log(response.config.method!, 'SUCCESS');
        return response;
      },
      error => {
        if (axios.isCancel(error)) {
          log(error.request.method!, 'CANCEL');
        } else {
          log(error.request.method!, 'ERROR');
        }

        return Promise.reject(error);
      },
    );
  }, []);

  return (
    <RequestProvider value={axiosInstance}>{props.children}</RequestProvider>
  );
};
