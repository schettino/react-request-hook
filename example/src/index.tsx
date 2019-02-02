import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';
import {RequestProvider} from './react-request-hook';
import axios from 'axios';

ReactDOM.render(
  <RequestProvider value={axios}>
    <App />
  </RequestProvider>,
  document.getElementById('root'),
);
