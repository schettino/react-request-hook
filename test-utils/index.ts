import actual from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

export const axios = Object.assign(jest.fn(actual), actual);
export const adapter = new AxiosMockAdapter(axios, {
  delayResponse: 100,
}) as AxiosMockAdapter & {
  axiosInstance: typeof axios;
};
