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

import {useMountedState} from './utils';

export type UseRequestResult<TRequest extends Request> = [
  {
    hasPending: boolean;
    clear: Canceler;
  },
  RequestFactory<TRequest>
];

class MissingProviderError extends Error {
  constructor() {
    super(
      'react-request-hook requires an Axios instance to be passed through ' +
        'context via the <RequestProvider>',
    );
  }
}

export function useRequest<TRequest extends Request>(
  fn: TRequest,
): UseRequestResult<TRequest> {
  const getMountedState = useMountedState();
  const axiosInstance = useContext(RequestContext);
  if (!axiosInstance) {
    throw new MissingProviderError();
  }

  const [sources, setSources] = useState<CancelTokenSource[]>([]);
  const mountedRef = useRef(true);

  const removeCancelToken = (cancelToken: CancelToken) => {
    if (mountedRef.current && getMountedState()) {
      setSources(prevSources =>
        prevSources.filter(source => source.token !== cancelToken),
      );
    }
  };

  const callFn = useRef(fn);
  useEffect(
    () => {
      callFn.current = fn;
    },
    [fn],
  );

  const request = useCallback(
    (...args: Arguments<TRequest> | any[]) => {
      const config = callFn.current(...args);
      const source = axios.CancelToken.source();

      const ready = () => {
        if (getMountedState()) {
          setSources(prevSources => [...prevSources, source]);
        }
        return axiosInstance({...config, cancelToken: source.token})
          .then(response => {
            removeCancelToken(source.token);
            return response.data;
          })
          .catch((error: AxiosError) => {
            removeCancelToken(source.token);
            throw createRequestError(error);
          });
      };

      return {
        ready,
        cancel: source.cancel,
      };
    },
    [axiosInstance],
  );

  const clear = useCallback(
    (message?: string) => {
      if (sources.length > 0) {
        sources.map(source => source.cancel(message));
        /* istanbul ignore next */
        if (mountedRef.current && getMountedState()) {
          setSources([]);
        }
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
