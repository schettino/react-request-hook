import {useEffect, useCallback, useRef, useReducer, useMemo} from 'react';
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

const REQUEST_CLEAR_MESSAGE =
  'A new request has been made before completing the last one';

type RequestState<TRequest extends Request> = {
  data: Payload<TRequest> | null;
  error: RequestError | null;
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

function getNextState(state: RequestState<any>, action: Action) {
  return {
    data: action.type === 'success' ? action.data : state.data,
    error: action.type === 'error' ? action.error : null,
    isLoading: action.type === 'start' ? true : false,
  };
}

export function useResource<TRequest extends Request>(
  fn: TRequest,
  defaultParams?: Arguments<TRequest>,
): UseResourceResult<TRequest> {
  const [{clear}, createRequest] = useRequest(fn);

  const [state, dispatch] = useReducer(getNextState, {
    error: null,
    data: null,
    isLoading: Boolean(defaultParams),
  });

  const lastAppliedParams = useRef<Arguments<TRequest> | null>(null);

  const request = useCallback(
    (...args: Arguments<TRequest> | any[]) => {
      clear(REQUEST_CLEAR_MESSAGE);
      const {ready, cancel} = createRequest(...(args as Arguments<TRequest>));
      dispatch({type: 'start'});
      ready()
        .then(data => {
          dispatch({type: 'success', data});
        })
        .catch((error: RequestError) => {
          if (!error.isCancel) {
            dispatch({type: 'error', error});
          }
        });
      return cancel;
    },
    [createRequest],
  );

  const cancel = (message?: string) => {
    dispatch({type: 'reset'});
    clear(message);
  };

  useEffect(() => {
    let canceller: Canceler;
    if (defaultParams && !isEqual(defaultParams, lastAppliedParams.current)) {
      lastAppliedParams.current = defaultParams;
      canceller = request(...defaultParams);
    }
    return () => {
      if (canceller) {
        canceller();
      }
    };
  }, defaultParams);

  return useMemo(() => {
    const result: UseResourceResult<TRequest> = [{...state, cancel}, request];
    return result;
  }, [state, request]);
}
