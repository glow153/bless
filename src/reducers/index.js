import { combineReducers } from 'redux';
import BleReducer from './bleReducer';

export default combineReducers({
  ble: BleReducer
});