import _ from 'lodash';
import types from '../actions/types';

const initialState = {
  bleManager: null,
  scanTime: 0,
  connectedDevice: null,
  connectedDeviceId: null,
  serviceUUID: null,
  characteristicsUUID: null,
};

export default (state = initialState, action) => {
  let newState;

  switch (action.type) {
    case types.BLE_MANAGER:
      newState = _.merge(state, {bleManager: action.payload});
      break;
    case types.BLE_SET_SCAN_TIME:
      newState = _.merge(state, {scanTime: action.payload});
      break;
    case types.BLE_CONNECTED_DEVICE:
      newState = _.merge(state, {connectedDevice: action.payload});
      break;
    case types.BLE_CONNECTED_DEVICE_ID:
      newState = _.merge(state, {connectedDeviceId: action.payload});
      break;
    case types.BLE_SERVICE_UUIDS:
      newState = _.merge(state, {serviceUUID: action.payload});
      break;
    case types.BLE_CHARACTERISTICS_UUID:
      newState = _.merge(state, {characteristicsUUID: action.payload});
      break;
    default:
      return state;
  }
  // console.log('new state:', newState);
  return newState;
};