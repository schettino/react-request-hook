import React, {useState} from 'react';
import {TextInput, Image, Text} from 'grommet';
import {useResource} from 'react-request-hook';
import useDebounce from '../useDebounce';
import api from '../api';
import {Row} from '../styles';

export default function SearchUser() {
  const [input, setInput] = useState<string>('Gabriel');
  const searchText = useDebounce(input);
  const [response] = useResource(api.searchUser, [searchText]);

  return (
    <>
      <TextInput value={input} onChange={e => setInput(e.target.value)} />
      {response.data &&
        response.data.map((user, index) => (
          <Row key={user.id} alpha={index + 1}>
            <Image src={user.avatar} />
            <Text size="large">{user.name}</Text>
          </Row>
        ))}
    </>
  );
}
