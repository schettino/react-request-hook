import {useEffect, useCallback, useReducer, useMemo, useState} from 'react';
import isEqual from 'fast-deep-equal';
import {Canceler} from 'axios';
import {useRequest} from './useRequest';
import {
  Payload,
  RequestError,
  Request,
  RequestDispatcher,
  Arguments,
} from './request';

import {useMountedState} from './utils';

const REQUEST_CLEAR_MESSAGE =
  'A new request has been made before completing the last one';

type RequestState<TRequest extends Request> = {
  data?: Payload<TRequest>;
  error?: RequestError;
  isLoading: boolean;
};

export type UseResourceResult<TRequest extends Request> = [
  RequestState<TRequest> & {cancel: Canceler},
  RequestDispatcher<TRequest>
];

type Action =
  | {type: 'success'; data: any}
  | {type: 'error'; error: RequestError}
  | {type: 'reset' | 'start'};

function getNextState(
  state: RequestState<any>,
  action: Action,
): RequestState<any> {
  return {
    data: action.type === 'success' ? action.data : state.data,
    error: action.type === 'error' ? action.error : undefined,
    isLoading: action.type === 'start' ? true : false,
  };
}

export function useResource<TRequest extends Request>(
  fn: TRequest,
  defaultParams?: Arguments<TRequest>,
): UseResourceResult<TRequest> {
  const getMountedState = useMountedState();
  const [{clear}, createRequest] = useRequest(fn);
  const [state, dispatch] = useReducer(getNextState, {
    isLoading: Boolean(defaultParams),
  });

  const [requestParams, setRequestParams] = useState(defaultParams);

  const request = useCallback(
    (...args: Arguments<TRequest> | any[]) => {
      clear(REQUEST_CLEAR_MESSAGE);
      const {ready, cancel} = createRequest(...(args as Arguments<TRequest>));

      if (getMountedState()) {
        (async function flow() {
          try {
            dispatch({type: 'start'});
            const data = await ready();
            dispatch({type: 'success', data});
          } catch (error) {
            if (!error.isCancel && getMountedState())
              dispatch({type: 'error', error});
          }
        })();
      }

      return cancel;
    },
    [createRequest],
  );

  useEffect(() => {
    // The array of default request params is a dependency that we pass directly
    // as a dependency to this useEffect, which will run on the initial render
    // and subsequent params updates, triggering new requests as the params change.
    // If the dependency is not set, we avoid going down this road. Hooks should be
    // either fully controlled or self-contained.
    if (!defaultParams) return;

    // We perform an deep equality check of the params and rely on React's bail out
    // to control future request calls made passing default params as dependency
    if (getMountedState()) {
      setRequestParams(current =>
        isEqual(current, defaultParams) ? current : defaultParams,
      );
    }
  }, defaultParams);

  useEffect(
    () => {
      let canceller: Canceler = () => {};
      if (requestParams) {
        canceller = request(...requestParams);
      }
      return canceller;
    },
    [requestParams],
  );

  return useMemo(
    () => {
      const cancel = (message?: string) => {
        getMountedState() && dispatch({type: 'reset'});
        clear(message);
      };

      const result: UseResourceResult<TRequest> = [{...state, cancel}, request];
      return result;
    },
    [state, request],
  );
}
