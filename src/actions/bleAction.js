import types from './types';

export function updateBleManager(mgr) {
  console.log("redux action: updateBleManager - ", mgr);
  return {
    type: types.BLE_MANAGER,
    payload: mgr,
  };
}

export function updateBleConnectedDevice(id) {
  console.log("redux action: updateBleConnectedDevice - ", id);
  return {
    type: types.BLE_CONNECTED_DEVICE,
    payload: id,
  };
}

export function updateBleConnectedDeviceId(id) {
  console.log("redux action: bleConnectedDeviceId - ", id);
  return {
    type: types.BLE_CONNECTED_DEVICE_ID,
    payload: id,
  };
}

export function updateBleServiceUUIDs(uuid) {
  console.log("redux action: bleServiceUUIDs - ", uuid);
  return {
    type: types.BLE_SERVICE_UUIDS,
    payload: uuid,
  };
}

export function updateBleCharacteristicsUUID(uuid) {
  console.log("redux action: bleCharacteristicsUUID - ", uuid);
  return {
    type: types.BLE_CHARACTERISTICS_UUID,
    payload: uuid,
  };
}