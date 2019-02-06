import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {RequestProvider} from '../requestContext';
import {useResource, UseResourceResult} from '../useResource';
import {wait, flushEffects} from 'react-testing-library';
import {adapter} from '../../test-utils';
import {Request, request} from '../request';

describe('useResource', () => {
  let reactRoot: HTMLDivElement;
  const axios = adapter.axiosInstance;
  const onRequestCancel = jest.fn();

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
    fn: Request = () =>
      request({
        url: '/users',
        method: 'GET',
      }),
    dependencies?: any[],
  ) {
    const values = {users: {}} as {
      users: UseResourceResult<any>[0];
      getUsers: UseResourceResult<any>[1];
    };

    const Component = () => {
      const [users, getUsers] = useResource(fn, dependencies);
      Object.assign(values.users, users);
      values.getUsers = getUsers;
      return null;
    };

    render(<Component />);
    flushEffects();
    return values;
  }

  it('should make the request when the default params have been passed', async () => {
    adapter.onGet('/users/userId').reply(200, {id: '1', name: 'luke'});

    const values = setup(
      (id: string) => ({
        url: `/users/${id}`,
        method: 'GET',
      }),
      ['userId'],
    );

    await wait(() =>
      expect(values.users.data).toEqual({id: '1', name: 'luke'}),
    );
    expect(values.users.isLoading).toEqual(false);
    expect(values.users.error).toEqual(null);
    expect(values.users.cancel).toEqual(expect.any(Function));
  });

  it('should cancel a pending request on unmount', async () => {
    adapter.onGet('/users').reply(200, []);
    setup().getUsers();
    ReactDOM.unmountComponentAtNode(reactRoot);
    await wait(() => expect(onRequestCancel).toHaveBeenCalledTimes(1));
  });

  it('should cancel last pending request when changing default params', async () => {
    adapter.onGet('/users/1').reply(200, {id: '1', name: 'luke'});
    adapter.onGet('/users/2').reply(200, {id: '2', name: 'vader'});
    const onSuccess = jest.fn();
    const Component: React.FC = () => {
      const [userId, setUserId] = React.useState('1');
      const [users] = useResource(
        (id: string) => ({
          method: 'GET',
          url: `/users/${id}`,
        }),
        [userId],
      );
      React.useEffect(() => {
        if (userId === '1' && users.isLoading) {
          setUserId('2');
        }
        if (users.data) {
          onSuccess(users.data);
        }
      }, [users, userId]);
      return null;
    };

    render(<Component />);
    await wait(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({id: '2', name: 'vader'});
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
  });

  it('should allow only one request at time', async () => {
    adapter.onGet('/users').reply(200, []);

    const values = setup();

    values.getUsers();
    setTimeout(values.getUsers);

    await wait(() => expect(values.users.data).toEqual([]));
    expect(values.users.error).toEqual(null);
    expect(values.users.isLoading).toEqual(false);
    expect(onRequestCancel).toHaveBeenCalledTimes(1);
  });

  it('should allow to cancel programmatically a request', async () => {
    adapter.onGet('/users').reply(200, []);

    const values = setup();

    values.getUsers();
    setTimeout(values.users.cancel);

    await wait(() => expect(onRequestCancel).toHaveBeenCalledTimes(1));
    expect(values.users.data).toEqual(null);
    expect(values.users.error).toEqual(null);
    expect(values.users.isLoading).toEqual(false);
  });

  it('should return a error properly when it occurs', async () => {
    adapter.onGet('/users').reply(500, {message: 'Internal Error'});

    const values = setup();

    values.getUsers();

    await wait(() =>
      expect(values.users.error).toEqual({
        code: 500,
        data: {message: 'Internal Error'},
        isCancel: false,
        message: 'Request failed with status code 500',
      }),
    );

    expect(values.users.cancel).toEqual(expect.any(Function));
    expect(values.users.data).toEqual(null);
    expect(values.users.isLoading).toEqual(false);
  });
});
