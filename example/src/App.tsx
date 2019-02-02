import * as React from 'react';
import {useResource, useRequest, request, Resource} from './react-request-hook';

const getUser = (): Resource<number> => ({
  url: 'https://reqres.in/api/users',
  method: 'GET',
});

function App() {
  const [, getResource] = useResource(getUser, []);
  return (
    <span>
      <a onClick={() => getResource()}>Refresh</a>
    </span>
  );
}

function Wrapper() {
  const [isHidden, setHidden] = React.useState(true);
  return (
    <>
      <a href="#" onClick={() => setHidden(!isHidden)}>
        Toggle
      </a>
      <br />
      {!isHidden && <App />}
    </>
  );
}

export default Wrapper;
