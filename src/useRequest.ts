import {useState, useCallback, useContext, useRef, useEffect} from 'react';
import axios, {
  AxiosError,
  CancelTokenSource,
  Canceler,
  CancelToken,
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
  const mountedRef = useRef(true);

  const removeCancelToken = (cancelToken: CancelToken) => {
    if (mountedRef.current) {
      setSources(prevSources =>
        prevSources.filter(source => source.token !== cancelToken),
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
              removeCancelToken(source.token);
              return response.data;
            })
            .catch((error: AxiosError) => {
              removeCancelToken(source.token);
              throw createRequestError(error);
            }),
      };
    },
    [axiosInstance],
  );

  const clear = useCallback(
    (message?: string) => {
      if (sources.length > 0) {
        sources.map(source => source.cancel(message));
        setSources([]);
      }
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
      mountedRef.current = false;
    };
  }, []);

  return [
    {
      clear: (message?: string) => clearRef.current(message),
      hasPending: sources.length > 0,
    },
    request,
  ];
}
