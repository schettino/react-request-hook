import React, {useState, useEffect} from 'react';
import useDebounce from '../useDebounce';
import {useResource} from 'react-request-hook';
import {TextInput, Image, Text} from 'grommet';
import api from '../api';
import {Row} from '../styles';

export function SearchUserOptmized() {
  const [input, setInput] = useState<string>('Gabriel');
  const searchText = useDebounce(input);
  const [{data, cancel}] = useResource(api.searchUser, [searchText]);

  // Different from SearchUser, we trigger the cancel as soon as the input changes
  useEffect(() => {
    if (searchText !== input) {
      cancel();
    }
  }, [input]);

  return (
    <>
      <TextInput value={input} onChange={e => setInput(e.target.value)} />
      {data &&
        data.map((user, index) => (
          <Row key={user.id} alpha={index + 1}>
            <Image src={user.avatar} />
            <Text size="large">{user.name}</Text>
          </Row>
        ))}
    </>
  );
}
