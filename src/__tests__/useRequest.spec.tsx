import * as React from 'react';
import {wait, act, cleanup, render} from 'react-testing-library';
import {RequestProvider, RequestContext} from '../requestContext';
import {useRequest, UseRequestResult} from '../useRequest';
import {adapter} from '../../test-utils';
import {Request} from '../request';

class Deferred {
  resolve: (...args: unknown[]) => void;
  reject: (...args: unknown[]) => void;
  promise: Promise<any>;
  constructor(resolveValue?: any) {
    this.resolve = () => {
      throw new Error('promise not initialized');
    };
    this.reject = () => {
      throw new Error('promise not initialized');
    };

    this.promise = new Promise(
      function(this: any, resolve: any, reject: any) {
        this.resolve = resolveValue ? () => resolve(resolveValue) : resolve;
        this.reject = reject;
      }.bind(this),
    );
  }
}

describe('useRequest', () => {
  const axios = adapter.axiosInstance;
  const onCancel = jest.fn();

  axios.interceptors.response.use(
    config => config,
    error => {
      if (axios.isCancel(error)) {
        onCancel(error);
      }
      throw error;
    },
  );

  beforeEach(() => {
    axios.mockClear();
    onCancel.mockClear();
    adapter.reset();
  });

  afterEach(() => {
    cleanup();
  });

  function setup(fn?: Request | null) {
    const hook = {response: {}} as {
      response: UseRequestResult<any>[0];
      request: UseRequestResult<any>[1];
    };

    const defaultRequest = fn ? fn : () => ({url: '/users', method: 'GET'});

    const Component = () => {
      const [response, request] = useRequest(defaultRequest);
      hook.response = response;
      hook.request = request;
      return null;
    };

    const rendered = render(
      <RequestProvider value={axios}>
        <Component />
      </RequestProvider>,
    );

    return {hook, ...rendered};
  }

  it('should call the axios instance when it is ready to make the request', async () => {
    adapter.onGet('/users').reply(200, []);
    const source = jest.spyOn(axios.CancelToken, 'source');
    const {hook} = setup();

    let result;
    await act(async () => {
      result = await hook.request().ready();
    });

    expect(source).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
      cancelToken: {promise: expect.any(Promise)},
      url: '/users',
      method: 'GET',
    });
    expect(result).toEqual([]);
    source.mockRestore();
  });

  it('should update hasPending properly', async () => {
    adapter.onGet('/users').reply(200, []);
    let promises: Deferred[] = [];

    adapter.axiosInstance.interceptors.request.use(config => {
      const p = new Deferred(config);
      promises.push(p);
      return p.promise;
    });

    const {hook} = setup();

    expect(hook.response.hasPending).toBe(false);
    await act(async () => {
      hook.request().ready();
      hook.request().ready();
    });

    await act(async () => {
      const [p1, p2] = promises;
      expect(hook.response.hasPending).toBe(true);

      p1.resolve();
      expect(hook.response.hasPending).toBe(true);

      p2.resolve();
      await wait(() => {
        expect(hook.response.hasPending).toBe(false);
      });
    });

    axios.interceptors.request.eject(0);
  });

  it('should resolve with the response data', async () => {
    adapter.onGet('/users').reply(200, [{id: '1', name: 'luke skywalker'}]);
    const {hook} = setup();

    let result;
    await act(async () => {
      result = await hook.request().ready();
    });

    expect(result).toEqual([{id: '1', name: 'luke skywalker'}]);
  });

  it('should reject with a normalized error data', async () => {
    adapter.onGet('/user/1').reply(404, {message: 'User not found'});

    const {hook} = setup((id: string) => ({
      url: `/user/${id}`,
      method: 'get',
    }));

    let error;
    await act(async () => {
      try {
        await hook.request('1').ready();
      } catch (e) {
        error = e;
      }
    });

    expect(error).toEqual({
      code: 404,
      data: {message: 'User not found'},
      isCancel: false,
      message: 'Request failed with status code 404',
    });
  });

  it('should cancel all pending requests when `clear` is called', async () => {
    adapter.onGet('/users').reply(200, []);

    let promises: Deferred[] = [];

    axios.interceptors.request.use(config => {
      const p = new Deferred(config);
      promises.push(p);
      return p.promise;
    });

    const error = {
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel message',
    };

    const {hook} = setup();
    const {ready, cancel} = hook.request();

    const onError = jest.fn();
    const onSuccess = jest.fn();
    await act(async () => {
      ready()
        .then(() => onSuccess('Promise 1'))
        .catch(onError);
      ready()
        .then(() => onSuccess('Promise 2'))
        .catch(onError);
      ready()
        .then(() => onSuccess('Promise 3'))
        .catch(onError);
    });

    const [p1, p2, p3] = promises;

    await act(async () => {
      p1.resolve();
      await wait(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith('Promise 1');
      });
    });

    act(() => cancel('cancel message'));

    await act(async () => {
      p2.resolve();
      p3.resolve();
      await wait(() => expect(onError).toHaveBeenCalledTimes(2));
    });

    expect(onError).toHaveBeenCalledWith(error);
    axios.interceptors.request.eject(1);
  });

  it('should cancel all requests created from the same factory when calling the canceler', async () => {
    adapter.onGet('/users').reply(200, []);
    const {hook} = setup();

    const error = {
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel',
    };

    await act(async () => {
      let p1, p2, p3;
      const r1 = hook.request();
      const r2 = hook.request();
      p1 = r1.ready();
      p2 = r1.ready();
      p3 = r2.ready();

      r1.cancel('cancel');

      await expect(p1).rejects.toEqual(error);
      await expect(p2).rejects.toEqual(error);
      await expect(p3).resolves.toEqual([]);
    });
  });

  it('should cancel pending requests on unmount', async () => {
    const {hook, unmount} = setup();

    let p;
    act(() => {
      p = hook.request().ready();
    });

    unmount();

    await expect(p).rejects.toEqual({
      isCancel: true,
      message: undefined,
      code: undefined,
      data: null,
    });
  });

  it('uses the last returned axios config', async () => {
    const Component = () => {
      const [endpoint, setEndpoint] = React.useState('endpoint-1');
      React.useEffect(() => setEndpoint('endpoint-2'), []);
      const [, request] = useRequest(() => ({
        url: `/${endpoint}`,
        method: 'get',
      }));

      React.useEffect(() => {
        request().ready();
      }, [endpoint, request]);

      return null;
    };

    render(
      <RequestProvider value={axios}>
        <Component />
      </RequestProvider>,
    );

    await wait(() => expect(adapter.history.get.length).toEqual(2));
    expect(adapter.history.get[0].url).toEqual('/endpoint-1');
    expect(adapter.history.get[1].url).toEqual('/endpoint-2');
  });

  it('should use the lastest axios instance', async () => {
    const instance1 = adapter.axiosInstance.create({
      baseURL: 'https://instance1',
    });

    const instance2 = adapter.axiosInstance.create({
      baseURL: 'https://instance2',
    });

    const Provider: React.FC = ({children}) => {
      const [instance, setInstance] = React.useState(() => instance1);
      React.useEffect(() => setInstance(() => instance2), []);
      return <RequestProvider value={instance}>{children}</RequestProvider>;
    };

    let usedInstances = 0;
    const Component = () => {
      const current = React.useContext(RequestContext);
      const [, request] = useRequest(() => ({
        url: '/users',
        method: 'get',
      }));

      React.useEffect(() => {
        usedInstances++;
        request().ready();
        request().ready();
      }, [current, request]);

      return null;
    };

    adapter.onGet(/.*\/users/).reply(200, []);
    let countInstance1 = 0;
    let countInstance2 = 0;

    instance1.interceptors.request.use(config => {
      countInstance1++;
      return config;
    });

    instance2.interceptors.request.use(config => {
      countInstance2++;
      return config;
    });

    render(
      <Provider>
        <Component />
      </Provider>,
    );

    await wait(() => {
      expect(usedInstances).toBe(2);
      expect(countInstance1).toBe(2);
      expect(countInstance2).toBe(2);
    });
  });

  it('throws if provider is missing', () => {
    const Component = () => {
      expect(() => {
        useRequest(() => ({url: ''}));
      }).toThrow();
      return null;
    };

    render(<Component />);
  });
});
