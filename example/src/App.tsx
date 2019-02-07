import * as React from 'react';
import {Sandbox} from './Sandbox';
import {UserList} from './components/UserList';

function App() {
  return (
    <Sandbox name="USER_LIST">
      <UserList />
    </Sandbox>
  );
}

export default App;
