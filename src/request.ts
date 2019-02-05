import axios, {AxiosRequestConfig, AxiosError, Canceler} from 'axios';

export type Arguments<T> = T extends (...args: infer A) => any ? A : never;

export interface Resource<TPayload> extends AxiosRequestConfig {
  payload?: TPayload;
}

export interface Request {
  (...args: any[]): Resource<any>;
}

export type Payload<TRequest extends Request> = ReturnType<TRequest>['payload'];

export interface RequestFactory<TRequest extends Request> {
  (...args: Arguments<TRequest>): {
    cancel: Canceler;
    ready: () => Promise<Payload<TRequest>>;
  };
}

export interface RequestDispatcher<TRequest extends Request> {
  (...args: Arguments<TRequest>): Canceler;
}

// Normalize the error response returned from our hooks
export interface RequestError {
  data: any;
  message: string;
  code?: string;
  isCancel: boolean;
}

export function request<TPayload>(
  config: AxiosRequestConfig,
  // we use 'payload' to enable non-ts applications to leverage type safety and
  // as a argument sugar that allow us to extract the payload type easily
  // @ts-ignore
  paylaod?: TPayload,
): Resource<TPayload> {
  return config;
}

export function createRequestError(error: AxiosError): RequestError {
  const data = error.response ? error.response.data : null;
  return {
    data,
    message: error.message,
    code:
      (data && data.code) ||
      error.code ||
      (error.response && error.response.status),
    isCancel: axios.isCancel(error),
  };
}
