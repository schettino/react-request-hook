import {createContext} from 'react';
import {AxiosInstance} from 'axios';

export const RequestContext = createContext<AxiosInstance | null>(null);
export const RequestProvider = RequestContext.Provider;
export const RequestConsumer = RequestContext.Consumer;
