import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {StoreContext} from 'redux-react-hook';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import store from './store';

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StoreContext.Provider>,
  document.getElementById('root'),
);
