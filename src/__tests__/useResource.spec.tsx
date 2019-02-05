import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {RequestProvider} from '../requestContext';
import {useResource, UseResourceResult} from '../useResource';
import {wait, flushEffects} from 'react-testing-library';
import {adapter} from '../../test-utils';

describe('useResource', () => {
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

  it('should make the request when the default params have been passed', async () => {
    const onSuccess = jest.fn();
    const Component = ({id = '1'}) => {
      const [users] = useResource(
        (id: string) => ({url: `/users/${id}`, method: 'get'}),
        [id],
      );
      React.useEffect(() => {
        onSuccess(users);
      }, [users.data]);
      return null;
    };

    adapter.onGet('/users/1').reply(200, {id: '1', name: 'matheus'});
    render(<Component />);

    await wait(() => expect(onSuccess).toHaveBeenCalledTimes(2));

    expect(onSuccess).toHaveBeenNthCalledWith(1, {
      data: null,
      error: null,
      isLoading: true,
      cancel: expect.any(Function),
    });
    expect(onSuccess).toHaveBeenNthCalledWith(2, {
      data: {id: '1', name: 'matheus'},
      error: null,
      isLoading: false,
      cancel: expect.any(Function),
    });
  });

  it('should cancel a pending request on unmount', async () => {
    const Component = ({id = '1'}) => {
      useResource((id: string) => ({url: `/users/${id}`, method: 'get'}), [id]);
      return null;
    };

    let totalErrors = 0;
    adapter.onGet('/users/1').reply(200, {id: '1', name: 'matheus'});
    axios.interceptors.response.use(
      config => config,
      error => {
        if (axios.isCancel(error)) {
          totalErrors++;
        }
        return error;
      },
    );

    render(<Component />);
    ReactDOM.unmountComponentAtNode(reactRoot);

    await wait(() => expect(totalErrors).toBe(1));
    axios.interceptors.response.eject(0);
  });

  // experimental
  it.only('should allow one request at time', async () => {
    type MapHook = {
      users: UseResourceResult<any>[0];
      getUsers: UseResourceResult<any>[1];
    };

    function setup(map: MapHook) {
      const Component = () => {
        const [users, getUsers] = useResource(() => ({
          url: '/users',
          method: 'GET',
        }));
        map.users = users;
        map.getUsers = getUsers;
        return null;
      };
      render(<Component />);
      flushEffects();
    }

    adapter.onGet('/users').reply(200, []);

    let totalErrors = 0;
    axios.interceptors.response.use(
      config => config,
      error => {
        if (axios.isCancel(error)) {
          totalErrors++;
        }
        return error;
      },
    );

    let values = {} as MapHook;
    setup(values);

    values.getUsers();
    setTimeout(values.getUsers);

    await wait(() => expect(values.users.data).toEqual([]));
    expect(totalErrors).toBe(1);
    axios.interceptors.response.eject(0);
  });

  it('should allow one request at time', async () => {
    const onSuccess = jest.fn();
    const Component = () => {
      const [users, getUsers] = useResource(() => ({
        url: '/users',
        method: 'GET',
      }));

      React.useEffect(() => {
        getUsers();
        setTimeout(getUsers);
      }, []);

      React.useEffect(() => {
        if (users.data) {
          onSuccess(users.data);
        }
      }, [users.data]);

      return null;
    };

    adapter.onGet('/users').reply(200, []);

    let totalErrors = 0;
    axios.interceptors.response.use(
      config => config,
      error => {
        if (axios.isCancel(error)) {
          totalErrors++;
        }
        return error;
      },
    );

    render(<Component />);

    await wait(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(totalErrors).toBe(1);
    expect(onSuccess).toHaveBeenCalledWith([]);
    axios.interceptors.response.eject(0);
  });

  it('should allow to cancel programmatically a request', async () => {
    const Component = () => {
      const [users, getUsers] = useResource(() => ({
        url: `/users`,
        method: 'GET',
      }));

      React.useEffect(() => {
        getUsers();
      }, []);

      React.useEffect(() => {
        if (users.isLoading) {
          setTimeout(users.cancel);
        }
      }, [users.isLoading]);

      return null;
    };

    let totalErrors = 0;
    axios.interceptors.response.use(
      config => config,
      error => {
        if (axios.isCancel(error)) {
          totalErrors++;
        }
        return error;
      },
    );

    adapter.onGet('/users').reply(200, []);
    render(<Component />);
    await wait(() => expect(totalErrors).toBe(1));
  });

  it('should return a error properly when it occurs', () => {});
});
