import React from 'react';
import { Provider } from 'react-redux';
import { Ble } from './components';
import initStore from './store';

const store = initStore();

const App = () => {
  return (
    <Provider store={store}>
      <Ble />
    </Provider>
  );
};

export default App;