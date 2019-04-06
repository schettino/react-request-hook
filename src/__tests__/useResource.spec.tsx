import * as React from 'react';
import {wait, act, render, cleanup} from 'react-testing-library';
import {RequestProvider} from '../requestContext';
import {useResource, UseResourceResult} from '../useResource';
import {adapter} from '../../test-utils';
import {Request, request} from '../request';

describe('useResource', () => {
  const axios = adapter.axiosInstance;
  const onRequestCancel = jest.fn();

  const Provider: React.FC = ({children}) => (
    <RequestProvider value={axios}>{children}</RequestProvider>
  );

  axios.interceptors.response.use(
    config => config,
    error => {
      if (axios.isCancel(error)) {
        onRequestCancel(error);
      }
      throw error;
    },
  );

  beforeEach(() => {
    axios.mockClear();
    onRequestCancel.mockClear();
    adapter.reset();
  });

  afterEach(cleanup);

  function setup(
    fn: Request = () => request({url: '/users', method: 'GET'}),
    dependencies?: any[],
  ) {
    const hook = {users: {}} as {
      users: UseResourceResult<any>[0];
      getUsers: UseResourceResult<any>[1];
    };

    const Component = () => {
      const [users, getUsers] = useResource(fn, dependencies);
      hook.users = users;
      hook.getUsers = getUsers;
      return null;
    };

    const rendered = render(
      <Provider>
        <Component />
      </Provider>,
    );

    return {hook, ...rendered};
  }

  it('should make the request when the default params have been passed', async () => {
    adapter.onGet('/users/userId').reply(200, {id: '1', name: 'luke'});

    const {hook} = setup(
      (id: string) => ({url: `/users/${id}`, method: 'GET'}),
      ['userId'],
    );

    await act(async () => {
      await wait(() =>
        expect(hook.users.data).toEqual({id: '1', name: 'luke'}),
      );
    });

    expect(hook.users.isLoading).toEqual(false);
    expect(hook.users.error).toEqual(null);
    expect(hook.users.cancel).toEqual(expect.any(Function));
  });

  it('should cancel a pending request on unmount', async () => {
    adapter.onGet('/users').reply(200, []);

    const {hook, unmount} = setup();
    act(() => {
      hook.getUsers();
    });
    unmount();

    await wait(() => expect(onRequestCancel).toHaveBeenCalledTimes(1));
  });

  it('should cancel last pending request when changing default params', async () => {
    adapter.onGet('/users/1').reply(200, {id: '1', name: 'luke'});
    adapter.onGet('/users/2').reply(200, {id: '2', name: 'vader'});

    const onSuccess = jest.fn();

    const Component: React.FC = () => {
      const [userId, setUserId] = React.useState('1');
      const [users] = useResource(
        (id: string) => ({method: 'GET', url: `/users/${id}`}),
        [userId],
      );
      React.useEffect(() => {
        if (userId === '1') setUserId('2');
        if (users.data) onSuccess(users.data);
      }, [users, userId]);
      return null;
    };

    render(
      <Provider>
        <Component />
      </Provider>,
    );

    await act(async () => {
      await wait(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({id: '2', name: 'vader'});
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
  });

  it('should allow only one request at time', async () => {
    adapter.onGet('/users').reply(200, []);

    const {hook} = setup();

    act(() => {
      hook.getUsers();
    });
    act(() => {
      hook.getUsers();
    });

    await act(async () => {
      await wait(() => expect(hook.users.data).toEqual([]));
    });

    expect(hook.users.error).toEqual(null);
    expect(hook.users.isLoading).toEqual(false);
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
  });

  it('should allow to cancel programmatically a request', async () => {
    adapter.onGet('/users').reply(200, []);

    const {hook} = setup();

    act(() => {
      hook.getUsers();
    });
    act(() => {
      hook.users.cancel();
    });
    await act(async () => {
      await wait(() => expect(onRequestCancel).toHaveBeenCalledTimes(1));
    });

    expect(hook.users.data).toEqual(null);
    expect(hook.users.error).toEqual(null);
    expect(hook.users.isLoading).toEqual(false);
  });

  it('should return a error properly when it occurs', async () => {
    adapter.onGet('/users').reply(500, {message: 'Internal Error'});

    const {hook} = setup();

    await act(async () => {
      hook.getUsers();
      await wait(() =>
        expect(hook.users.error).toEqual({
          code: 500,
          data: {message: 'Internal Error'},
          isCancel: false,
          message: 'Request failed with status code 500',
        }),
      );
    });

    expect(hook.users.cancel).toEqual(expect.any(Function));
    expect(hook.users.data).toEqual(null);
    expect(hook.users.isLoading).toEqual(false);
  });
});
