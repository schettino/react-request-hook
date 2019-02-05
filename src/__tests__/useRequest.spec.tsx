import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {wait, flushEffects} from 'react-testing-library';
import {RequestProvider, RequestContext} from '../requestContext';
import {useRequest} from '../useRequest';
import {adapter} from '../../test-utils';

describe('useRequest', () => {
  let reactRoot: HTMLDivElement;
  const axios = adapter.axiosInstance;

  beforeEach(() => {
    axios.mockClear();
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

  function getText() {
    return reactRoot.textContent;
  }

  it('should call the axios instance when it is ready to make the request', () => {
    const source = jest.spyOn(axios.CancelToken, 'source');
    const Component = () => {
      const [, request] = useRequest(() => ({url: '/url', method: 'get'}));
      React.useEffect(() => {
        request().ready();
      }, []);
      return <div />;
    };

    adapter.onGet('/url').reply(200, []);
    render(<Component />);
    flushEffects();

    expect(source).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledTimes(1);
    expect(axios).toHaveBeenCalledWith({
      cancelToken: {promise: Promise.resolve()},
      url: '/url',
      method: 'get',
    });
  });

  it('should update hasPending properly', async () => {
    const Component = () => {
      const [{hasPending}, request] = useRequest(() => ({
        url: `/url`,
        method: 'get',
      }));
      React.useEffect(() => {
        const {ready} = request();
        ready();
        ready();
      }, []);
      return <div>{JSON.stringify(hasPending)}</div>;
    };

    adapter.onGet('/url').reply(200, []);
    let count = 0;
    axios.interceptors.request.use(config => {
      count++;
      return config;
    });

    render(<Component />);
    flushEffects();

    expect(getText()).toBe('true');
    await wait(() => {
      if (count === 1) {
        expect(getText()).toBe('true');
      }
      if (count === 2) {
        expect(getText()).toBe('false');
      }
    });
  });

  it('should resolve with the response data', async () => {
    const success = jest.fn();
    const Component = () => {
      const [, request] = useRequest(() => ({url: '/user/1', method: 'get'}));
      React.useEffect(() => {
        request()
          .ready()
          .then(success);
      }, []);
      return <div />;
    };

    adapter.onGet('/user/1').reply(200, {id: 1, name: 'Matheus'});
    render(<Component />);
    flushEffects();

    await wait(() => expect(success).toHaveBeenCalledTimes(1));
    expect(success).toHaveBeenCalledWith({id: 1, name: 'Matheus'});
  });

  it('should reject with a normalized error data', async () => {
    const error = jest.fn();
    const Component = () => {
      const [, request] = useRequest(() => ({url: '/user/1', method: 'get'}));
      React.useEffect(() => {
        request()
          .ready()
          .catch(error);
      }, []);
      return <div />;
    };

    adapter.onGet('/user/1').reply(404, {message: 'User not found'});
    render(<Component />);
    flushEffects();

    await wait(() => expect(error).toHaveBeenCalledTimes(1));
    expect(error).toHaveBeenCalledWith({
      code: 404,
      data: {message: 'User not found'},
      isCancel: false,
      message: 'Request failed with status code 404',
    });
  });

  it('should cancel all pending requests when `clear` is called', async () => {
    const error = jest.fn();
    const Component = () => {
      const [totalSuccess, setTotalSuccess] = React.useState(0);
      const [state, request] = useRequest(() => ({
        url: '/user/1',
        method: 'get',
      }));

      const createRequest = () => {
        return request()
          .ready()
          .then(() => setTotalSuccess(n => n + 1))
          .catch(error);
      };

      React.useEffect(() => {
        createRequest();
        createRequest();
        createRequest();
      }, []);

      React.useEffect(() => {
        // after the first call gets completed, clear the other two
        if (totalSuccess === 1) {
          state.clear('clear');
        }
      }, [totalSuccess]);

      return <div />;
    };

    adapter.onGet('/user/1').reply(200);
    let count = 0;
    axios.interceptors.request.use(config => {
      count++;
      // delay requests after the first one has been called
      if (count > 1) {
        return new Promise(resolve => setTimeout(() => resolve(config), 100));
      }
      return config;
    });

    render(<Component />);
    flushEffects();

    await wait(() => expect(error).toHaveBeenCalledTimes(2));
    expect(error).toHaveBeenCalledWith({
      code: undefined,
      data: null,
      isCancel: true,
      message: 'clear',
    });
  });

  it('should only cancel the current request when calling a returned canceler', async () => {
    const error = jest.fn();
    const Component = () => {
      const [, request] = useRequest(() => ({
        url: '/user/1',
        method: 'get',
      }));

      React.useEffect(() => {
        request()
          .ready()
          .catch(error);
        request()
          .ready()
          .catch(error);
        const {ready, cancel} = request();
        ready().catch(error);
        cancel('cancel');
      }, []);

      return <div />;
    };

    adapter.onGet('/user/1').reply(200);
    render(<Component />);
    flushEffects();

    await wait(() => expect(error).toHaveBeenCalledTimes(1));
    expect(error).toHaveBeenCalledWith({
      code: undefined,
      data: null,
      isCancel: true,
      message: 'cancel',
    });
  });

  it('should cancel pending requests on unmount', async () => {
    const error = jest.fn();
    const Component = () => {
      const [, request] = useRequest(() => ({
        url: '/user/1',
        method: 'get',
      }));

      React.useEffect(() => {
        request()
          .ready()
          .catch(error);
        request()
          .ready()
          .catch(error);
      }, []);

      return <div />;
    };

    adapter.onGet('/user/1').reply(200);
    render(<Component />);
    flushEffects();

    ReactDOM.unmountComponentAtNode(reactRoot);

    await wait(() => expect(error).toHaveBeenCalledTimes(2));

    expect(error).toHaveBeenCalledWith({
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
