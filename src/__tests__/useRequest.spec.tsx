import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {wait, flushEffects} from 'react-testing-library';
import {RequestProvider, RequestContext} from '../requestContext';
import {useRequest, UseRequestResult} from '../useRequest';
import {adapter} from '../../test-utils';
import {Request} from '../request';

describe('useRequest', () => {
  let reactRoot: HTMLDivElement;
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
    reactRoot = document.createElement('div');
    document.body.appendChild(reactRoot);
  });

  afterEach(() => {
    document.body.removeChild(reactRoot);
  });

  function render(element: React.ReactElement<any>) {
    ReactDOM.render(
      <RequestProvider value={axios}>{element}</RequestProvider>,
      reactRoot,
    );
  }

  function setup(
    fn: Request = () => ({
      url: '/users',
      method: 'GET',
    }),
  ) {
    const values = {response: {}} as {
      response: UseRequestResult<any>[0];
      request: UseRequestResult<any>[1];
    };

    const Component = () => {
      const [response, request] = useRequest(fn);
      Object.assign(values.response, response);
      values.request = request;
      return null;
    };

    render(<Component />);
    flushEffects();
    return values;
  }

  it('should call the axios instance when it is ready to make the request', () => {
    adapter.onGet('/users').reply(200, []);
    const source = jest.spyOn(axios.CancelToken, 'source');
    const values = setup();

    values.request().ready();

    expect(source).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
      cancelToken: {promise: expect.any(Promise)},
      url: '/users',
      method: 'GET',
    });
  });

  it('should update hasPending properly', async () => {
    adapter.onGet('/users').reply(200, []);
    const values = setup();

    const {ready} = values.request();
    ready();
    ready();

    let count = 0;
    axios.interceptors.request.use(config => {
      count++;
      return config;
    });

    expect(values.response.hasPending).toBe(true);
    await wait(() => {
      if (count === 1) {
        expect(values.response.hasPending).toBe(true);
      }
      if (count === 2) {
        expect(values.response.hasPending).toBe(false);
      }
    });
  });

  it('should resolve with the response data', async () => {
    adapter.onGet('/users').reply(200, [{id: 1, name: 'luke skywalker'}]);
    const values = setup();
    const p = values.request().ready();
    await expect(p).resolves.toEqual([{id: 1, name: 'luke skywalker'}]);
  });

  it('should reject with a normalized error data', async () => {
    adapter.onGet('/user/1').reply(404, {message: 'User not found'});
    const values = setup((id: string) => ({
      url: `/user/${id}`,
      method: 'get',
    }));

    const p = values.request('1').ready();

    await expect(p).rejects.toEqual({
      code: 404,
      data: {message: 'User not found'},
      isCancel: false,
      message: 'Request failed with status code 404',
    });
  });

  it('should cancel all pending requests when `clear` is called', async () => {
    adapter.onGet('/users').reply(200, []);

    const values = setup();
    const {ready} = values.request();
    const p1 = ready();
    const p2 = ready();
    const p3 = ready();

    values.response.clear('clear');

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

  it('should only cancel the current request when calling a canceler', async () => {
    adapter.onGet('/users').reply(200, []);

    const values = setup();
    const r1 = values.request();
    const r2 = values.request();

    const p1 = r1.ready();
    const p2 = r2.ready();

    r1.cancel('cancel');

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

    const values = setup();
    const r1 = values.request();
    const p1 = r1.ready();
    const p2 = r1.ready();

    r1.cancel('cancel');

    const error = {
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel',
    };
    
    await expect(p1).rejects.toEqual(error);
    await expect(p2).rejects.toEqual(error);
  });

  it('should cancel pending requests on unmount', async () => {
    const values = setup();
    const p = values.request().ready();
    ReactDOM.unmountComponentAtNode(reactRoot);
    await expect(p).rejects.toEqual({
      code: undefined,
      data: null,
      isCancel: true,
      message: undefined,
    });
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
      }, [current]);

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
    flushEffects();

    await wait(() => {
      expect(usedInstances).toBe(2);
      expect(countInstance1).toBe(2);
      expect(countInstance2).toBe(2);
    });
  });
});
