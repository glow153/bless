import { applyMiddleware, createStore } from 'redux';
import reducers from '../reducers';

export default function initStore() {
  const store = createStore( 
    reducers,
    applyMiddleware(
        // Middleware will not be applied to this sample.
    ), 
  );
  return store;
};
