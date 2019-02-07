import React, {useState, useEffect} from 'react';
import useDebounce from '../useDebounce';
import {useResource} from '../react-request-hook';
import {Box, TextInput} from 'grommet';
import api from '../api';

export function SearchUserOptmized() {
  const [input, setInput] = useState<string>('Gabriel');
  const searchText = useDebounce(input, 500);
  const [issues] = useResource(api.searchUser, [searchText]);

  useEffect(() => {
    if (searchText !== input) {
      issues.cancel();
    }
  }, [input]);

  return (
    <Box>
      <TextInput
        value={input}
        onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
          setInput(ev.target.value);
        }}
      />
      <Box>{JSON.stringify(issues)}</Box>
    </Box>
  );
}
