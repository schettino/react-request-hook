import React, {useState, useEffect, useCallback} from 'react';
import {Box, InfiniteScroll, Text} from 'grommet';
import {useResource} from '../react-request-hook';
import api, {User} from '../api';

export const UserList: React.FC = () => {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [users, getUsers] = useResource(api.getUsers, []);

  const onMore = useCallback(() => {
    console.log('HERE');
    if (users.data && users.data.page < users.data.total_pages) {
      getUsers(users.data.page + 1);
    }
  }, [users.data]);

  useEffect(() => {
    if (users.data) {
      const {data} = users.data;
      setUsersList(prevItems => [...prevItems, ...data]);
    }
  }, [users.data]);

  return (
    <Box height="small" overflow="auto" pad="medium">
      <InfiniteScroll step={2} items={usersList} onMore={onMore}>
        {(user: User) => (
          <Box
            flex={false}
            key={user.id}
            pad="large"
            background={`neutral-${(user.id % 4) + 1}`}
            align="center">
            <Text size="large" weight="bold" color="white">
              {JSON.stringify(user)}
            </Text>
          </Box>
        )}
      </InfiniteScroll>
    </Box>
  );
};
