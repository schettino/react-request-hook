import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {StoreContext} from 'redux-react-hook';
import App from './App';
import store from './store';

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <App />
  </StoreContext.Provider>,
  document.getElementById('root'),
);
