import {useState, useCallback, useContext, useRef, useEffect} from 'react';
import axios, {
  AxiosError,
  CancelTokenSource,
  AxiosResponse,
  Canceler,
} from 'axios';
import {
  createRequestError,
  RequestFactory,
  Request,
  Arguments,
} from './request';
import {RequestContext} from './requestContext';

export type UseRequestResult<TRequest extends Request> = [
  {
    hasPending: boolean;
    clear: Canceler;
  },
  RequestFactory<TRequest>
];

export function useRequest<TRequest extends Request>(
  fn: TRequest,
): UseRequestResult<TRequest> {
  const axiosInstance = useContext(RequestContext);
  const [sources, setSources] = useState<CancelTokenSource[]>([]);

  const removeCancelToken = (response?: AxiosResponse) => {
    if (response) {
      setSources(prevSources =>
        prevSources.filter(
          source => source.token !== response.config.cancelToken,
        ),
      );
    }
  };

  const request = useCallback(
    (...args: Arguments<TRequest> | any[]) => {
      const config = fn(...args);
      const source = axios.CancelToken.source();
      setSources(prevSources => [...prevSources, source]);
      return {
        cancel: source.cancel,
        ready: () =>
          axiosInstance!({...config, cancelToken: source.token})
            .then(response => {
              removeCancelToken(response);
              return response.data;
            })
            .catch((error: AxiosError) => {
              removeCancelToken(error.response);
              throw createRequestError(error);
            }),
      };
    },
    [fn],
  );

  const clear = useCallback(
    (message?: string) => {
      sources.map(source => source.cancel(message));
      setSources([]);
    },
    [sources],
  );

  const clearRef = useRef(clear);
  useEffect(() => {
    clearRef.current = clear;
  });

  useEffect(() => {
    return () => {
      clearRef.current();
    };
  }, []);

  return [
    {
      clear: () => clearRef.current(),
      hasPending: sources.length > 0,
    },
    request,
  ];
}
