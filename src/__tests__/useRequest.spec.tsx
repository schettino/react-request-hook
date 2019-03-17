import * as React from 'react';
import {wait, act, cleanup, render} from 'react-testing-library';
import {RequestProvider, RequestContext} from '../requestContext';
import {useRequest, UseRequestResult} from '../useRequest';
import {adapter} from '../../test-utils';
import {Request} from '../request';

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

  afterEach(cleanup);

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

    let p;
    act(() => {
      p = hook.request().ready();
    });

    expect(source).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
      cancelToken: {promise: expect.any(Promise)},
      url: '/users',
      method: 'GET',
    });
    await expect(p).resolves.toEqual([]);
    source.mockRestore();
  });

  it('should update hasPending properly', async () => {
    adapter.onGet('/users').reply(200, []);

    const {hook} = setup();
    act(() => {
      hook.request().ready();
      hook.request().ready();
    });

    expect(hook.response.hasPending).toBe(true);
    await wait(() => {
      if (adapter.history.get.length === 1) {
        expect(hook.response.hasPending).toBe(true);
      }
      if (adapter.history.get.length === 2) {
        expect(hook.response.hasPending).toBe(false);
      }

      return expect(adapter.history.get.length).toEqual(2);
    });
  });

  it('should resolve with the response data', async () => {
    adapter.onGet('/users').reply(200, [{id: '1', name: 'luke skywalker'}]);
    const {hook} = setup();

    let p;
    act(() => {
      p = hook.request().ready();
    });

    await expect(p).resolves.toEqual([{id: '1', name: 'luke skywalker'}]);
  });

  it('should reject with a normalized error data', async () => {
    adapter.onGet('/user/1').reply(404, {message: 'User not found'});
    const {hook} = setup((id: string) => ({
      url: `/user/${id}`,
      method: 'get',
    }));

    let p;
    act(() => {
      p = hook.request('1').ready();
    });

    await expect(p).rejects.toEqual({
      code: 404,
      data: {message: 'User not found'},
      isCancel: false,
      message: 'Request failed with status code 404',
    });
  });

  it('should cancel all pending requests when `clear` is called', async () => {
    adapter.onGet('/users').reply(200, []);

    let p1, p2, p3;
    const {hook} = setup();
    act(() => {
      const {ready} = hook.request();
      p1 = ready();
      p2 = ready();
      p3 = ready();
    });

    act(() => {
      hook.response.clear('clear');
    });

    const error = {
      code: undefined,
      data: null,
      isCancel: true,
      message: 'clear',
    };

    await expect(p1).rejects.toEqual(error);
    await expect(p2).rejects.toEqual(error);
    await expect(p3).rejects.toEqual(error);
  });

  it('should cancel the current request when calling a canceler', async () => {
    adapter.onGet('/users').reply(200, []);
    const {hook} = setup(null);

    let p1, p2;
    act(() => {
      const r1 = hook.request();
      const r2 = hook.request();
      p1 = r1.ready();
      p2 = r2.ready();
      r1.cancel('cancel');
    });

    await expect(p1).rejects.toEqual({
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel',
    });

    await expect(p2).resolves.toEqual([]);
  });

  it('should cancel all requests created from the same factory when calling the canceler', async () => {
    adapter.onGet('/users').reply(200, []);

    const {hook, unmount} = setup();
    const r1 = hook.request();

    let p1, p2;
    act(() => {
      p1 = r1.ready();
    });

    act(() => {
      p2 = r1.ready();
      r1.cancel('cancel');
    });

    const error = {
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel',
    };

    unmount();

    await expect(p1).rejects.toEqual(error);
    await expect(p2).rejects.toEqual(error);
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
});
