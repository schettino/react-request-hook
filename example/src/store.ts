import {createStore} from 'redux';
import {User} from './api';

const initialState = {
  usersListCached: {
    currentPage: 0 as number,
    data: [] as User[],
  },
};

export type CACHE_USERS = {
  type: 'CACHE_USERS';
  page: number;
  data: User[];
};

export type State = typeof initialState;

function reducer(state = initialState, action: any) {
  if (action.type === 'CACHE_USERS') {
    return Object.assign({}, state, {
      usersListCached: {
        currentPage: action.page,
        data: [...state.usersListCached.data, ...action.data],
      },
    });
  }
  return state;
}

const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
);

export default store;
