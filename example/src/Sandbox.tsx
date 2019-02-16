import React, {useState, useEffect} from 'react';
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosInstance,
} from 'axios';
import {RequestProvider} from './react-request-hook';
import {useDispatch} from 'redux-react-hook';

const BASE_URL = 'https://5c564f1ed293090014c0ee3e.mockapi.io/api/v1';

export const Sandbox: React.FC<{name: string}> = props => {
  const dispatch = useDispatch();
  const [count, setCount] = useState(0);
  const [instance, setInstance] = useState<AxiosInstance | null>(null);

  const log = (status: string) =>
    dispatch({
      type: `@${props.name} [${status}]`,
    });

  const onRequest = (config: AxiosRequestConfig) => {
    setCount(n => n + 1);
    log('START');
    return config;
  };

  const onSuccess = (response: AxiosResponse) => {
    log('SUCCESS');
    return response;
  };

  const onError = (error: AxiosError) => {
    if (axios.isCancel(error)) {
      log('CANCEL');
    } else {
      log('ERROR');
    }

    return Promise.reject(error);
  };

  useEffect(() => {
    const next = axios.create({baseURL: BASE_URL});
    next.interceptors.request.use(onRequest);
    next.interceptors.response.use(onSuccess, onError);
    setInstance(() => next);
  }, []);

  if (!instance) {
    return null;
  }

  return (
    <RequestProvider value={instance}>
      <>
        <span>REQUESTS: {count}</span>
        {props.children}
      </>
    </RequestProvider>
  );
};
