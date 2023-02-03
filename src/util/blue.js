import { BleManager, Device } from 'react-native-ble-plx';
import {
  base64ToHex,
  dateObjToTimestamp, hexToBase64,
  tryCall
} from ".";

export const sendPacket = async (device, serviceUUID, characteristicsUUID, packet) => {
  const data = hexToBase64(packet);
  const characteristic = await device.writeCharacteristicWithResponseForService(serviceUUID, characteristicsUUID, data);
  console.log(dateObjToTimestamp(), `>> sendPacket: ${serviceUUID}-${characteristicsUUID} - ${packet} (${data})`);
  return characteristic;
};

const getServicesAndCharacteristics = (device) => {
  return new Promise((resolve, reject) => {
    device.services().then((services) => {
      const characteristics = [];
      services.forEach((service, i) => {
        service.characteristics().then(c => {
          characteristics.push(c);
          if (i === services.length - 1) {
            const temp = characteristics.reduce((acc, current) => ([...acc, ...current]), []);
            const dialog = temp.filter(characteristic => characteristic.isWritableWithResponse);
            if (!dialog || dialog.length === 0) {
              reject('No writable characteristic');
            }
            resolve(dialog);
          }
        });
      });
    });
  });
};

export const readValue = async (device: Device, serviceUUID, characteristicUUID, toHex = true) => {
  let value = (await device.readCharacteristicForService(serviceUUID, characteristicUUID))?.value;
  if (toHex) {
    value = base64ToHex(value);
  }
  console.log(dateObjToTimestamp(), `>> read value: ${serviceUUID}-${characteristicUUID} -`, value);
  return value;
};

export const connectBleDevice = async (bleMgr: BleManager, device, onConnect) => {
  console.log(dateObjToTimestamp(), '>> connectBleDevice()');
  let _device = await bleMgr.connectToDevice(device.id, { autoConnect: true });
  _device = await _device.discoverAllServicesAndCharacteristics();
  await getServicesAndCharacteristics(_device); // 2023-02-02 dhpark: MUST DO THIS!!!
  tryCall(onConnect, _device);
  
  const unsub = bleMgr.onDeviceDisconnected(_device.id, (error, device) => {
    console.log(dateObjToTimestamp(), 'device disconnected:', device?.id);
    unsub.remove();
  });
};