import React, {useEffect, useCallback} from 'react';
import {Box, InfiniteScroll, Text, Image} from 'grommet';
import {useResource} from '../react-request-hook';
import api, {User} from '../api';
import {Row} from '../styles';
import {useMappedState, useDispatch} from 'redux-react-hook';
import {State} from '../store';

export const UserListCached: React.FC = () => {
  const dispatch = useDispatch();
  const mapStateToProps = useCallback(
    (state: State) => ({
      usersList: state.usersListCached.data,
      page: state.usersListCached.currentPage,
    }),
    [],
  );

  const [response, getUsers] = useResource(api.getUsers);
  const {page, usersList} = useMappedState(mapStateToProps);

  function onMore() {
    if (page < 10) {
      getUsers(page + 1);
    }
  }

  useEffect(() => {
    if (page === 0) {
      getUsers(1);
    }
  }, []);

  useEffect(() => {
    if (response.data) {
      dispatch({type: 'CACHE_USERS', page: page + 1, data: response.data});
    }
  }, [response.data]);

  return (
    <Box flex overflow="auto" pad="medium">
      <InfiniteScroll step={9} items={usersList} onMore={onMore}>
        {(user: User, index: number) => (
          <Row key={user.id} alpha={index + 1}>
            <Image src={user.avatar} />
            <Text size="large">{user.name}</Text>
          </Row>
        )}
      </InfiniteScroll>
    </Box>
  );
};
