import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList,
  LogBox, StyleSheet, Text,
  TextInput,
  TouchableHighlight,
  View
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { connect } from 'react-redux';
import ActionCreator from '../actions';
import * as Auth from '../auth';
import { delay, getCurrentTimePacket } from '../util';
import { connectBleDevice, readValue, sendPacket } from '../util/blue';


LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const MAX_SCAN_TIME = 10000;

var bleMgr = new BleManager();

const Ble = (props) => {
  var _scanTime = 0;
  var _deviceList = [];
  const [isScanning, setScanning] = useState(false);
  const [scanTime, setScanTime] = useState(0);
  const [deviceList, setDeviceList] = useState(new Array());
  const [selectedDevice, setSelectedDevice] = useState(undefined);
  const [serviceUUID, setServiceUUID] = useState("FFB0");
  const [characteristicsUUID, setCharacteristicsUUID] = useState("FFB5");
  const [packetText, setPacketText] = useState("0f1801");
  const [searchDeviceName, setSearchDeviceName] = useState("mlight01");

  useEffect(() => {
    console.log('>> useEffect()');
    Auth.requestPermissions().then(() => {
      if (!bleMgr) {
        console.log(dateObjToTimestamp(), '>> BLE Manager initiating...');
        bleMgr = new BleManager();
        bleMgr.onStateChange((state) => {
          console.log('>> onStateChange:', state);
        });
        props.updateBleManager(bleMgr);
      }
    });
    
    return () => {
      closeBleMgr();
    };
  }, []);

  const closeBleMgr = () => {
    console.log('>> closeBleMgr()');
    if (bleMgr) {
      bleMgr.cancelDeviceConnection(selectedDevice?.id);
      bleMgr.destroy();
      bleMgr = undefined;
    }
  };

  const stopScan = () => {
    console.log('>> stopScan()');
    setScanning(false);
    bleMgr.stopDeviceScan();
  };

  const isDeviceNameMatches = (device: Device) => {
    if (searchDeviceName) {
      return device.name === searchDeviceName;
    } else {
      return false;
    }
  }

  const startScan = () => {
    console.log('>> startScan(): start scan...');
    setScanning(true);
    // setScanTime(d => Date.now());
    _scanTime = Date.now();
    
    if (!bleMgr) {
      bleMgr = new BleManager();
    }

    if (_deviceList?.length > 0 || deviceList?.length > 0){
      setDeviceList([]);
      _deviceList = [];
    }
    
    bleMgr.startDeviceScan([], {allowDuplicates: false}, (error, device) => {
      if (error) {
        console.log("error occurred :(", error);
        stopScan();
        return;
      }

      if (device) {
        console.log("found device:", device.id);
        if (searchDeviceName) {
          if (device.name === searchDeviceName) {
            _deviceList.push(device);
            setDeviceList(prevDeviceList => [...prevDeviceList, device]);
            stopScan();
            return;
          }
        } else {
          if (_deviceList?.map(item => item.id).includes(device.id) === false) {
            _deviceList.push(device);
            setDeviceList(prevDeviceList => [...prevDeviceList, device]);
          }
        }
      }

      if (Date.now() - _scanTime >= MAX_SCAN_TIME || isDeviceNameMatches(device)) {
        console.log("stop scanning...");
        stopScan();
        return;
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{flex:0}}>
          <Text style={{flex:0}}>블루투스 디바이스 찾기</Text>
        </View>
        <View style={{flex:0, flexDirection: 'row'}}>
          {isScanning ? <ActivityIndicator /> : null}
          <TextInput value={searchDeviceName} style={{...styles.input, flex: 0, width: 100, marginRight: 7,}}
            onChangeText={text => setSearchDeviceName(text)}
          />
          <TouchableHighlight
            style={{...styles.btnScan, backgroundColor: isScanning ? '#349beb77' : '#349beb'}}
            underlayColor='#64cbfb'
            activeOpacity={0.95}
            disabled={isScanning}
            onPress={() => {
              if (isScanning) {
                stopScan();
              } else {
                startScan();
              }
            }}>
            <Text style={styles.btnScanText}>SCAN</Text>
          </TouchableHighlight>
        </View>
      </View>
      <View style={styles.body}>
        <FlatList style={styles.list}
          data={deviceList}
          renderItem={({item: deviceItem}) => {
            return (
              <TouchableHighlight
                underlayColor='#ddd'
                activeOpacity={0.95}
                onPress={() => {
                  console.log("selected device :", deviceItem.id, deviceItem.name);
                  connectBleDevice(bleMgr, deviceItem, async (device) => {
                    setSelectedDevice(device);
                    props.updateBleConnectedDevice(device);
                    props.updateBleConnectedDeviceId(device.id);

                    //--------------- postprocessing for merlot lighting ---------------//
                    // 2023-02-01 dhpark: 1. get security auth key
                    await sendPacket(device, "FFB0", "FFB6", "0000 0000 0000 5A00 00");
                    await delay(500); // 2023-02-02 dhpark: MUST DO THIS!!!
                    
                    // 2023-02-01 dhpark: 2. send security packet
                    const authKey = await readValue(device, "FFB0", "FFB6", true);
                    await sendPacket(device, "FFB0", "FFB6", authKey);
                    await delay(500); // 2023-02-02 dhpark: MUST DO THIS!!!
                    
                    // 2023-02-01 dhpark: 3. send current time packet
                    const datepacket = getCurrentTimePacket();
                    await sendPacket(device, "FFB0", "FFBC", datepacket);
                    await delay(500); // 2023-02-02 dhpark: MUST DO THIS!!!
                    
                    // 2023-02-02 dhpark: 4. if lighting is off or iteration mode,
                    const onoff = await readValue(device, "FFB0", "FFBF", true);
                    if (onoff.substring(0, 4) !== '0100') {
                      await sendPacket(device, "FFB0", "FFBF", '010000000000000000'); // dhpark: turnOn packet
                    }
                    //--------------- postprocessing for merlot lighting ---------------//
                  });
                }}
                style={styles.item}>
                <>
                  <Text style={styles.itemId}>id: {deviceItem.id}</Text>
                  <Text style={[styles.itemName, {color: deviceItem.name ? 'black' : '#ccc'}]}>name: {deviceItem.name ?? 'N/A'}</Text>
                </>
              </TouchableHighlight>
            );
          }}
          keyExtractor={item => item.id} />
      </View>
      <View style={styles.footer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Device Id</Text>
          <TextInput value={selectedDevice?.id} style={styles.input}
            onChangeText={text => setSelectedDevice(text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ServiceUUID</Text>
          <TextInput value={serviceUUID} style={styles.input}
            onChangeText={text => setServiceUUID(text)}
          />
          <Text style={styles.inputLabel}>CharUUID</Text>
          <TextInput value={characteristicsUUID} style={styles.input}
            onChangeText={text => setCharacteristicsUUID(text)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Packet</Text>
          <TextInput value={packetText}
            onChangeText={text => setPacketText(text)}
            style={[styles.input, {marginRight: 7}]}
          />
          <TouchableHighlight
            style={styles.btnSend}
            underlayColor='#ddd'
            activeOpacity={0.95}
            onPress={()=>{
              sendPacket(selectedDevice, serviceUUID, characteristicsUUID, packetText);
            }}>
            <Text style={styles.btnSendText}>Send</Text>
          </TouchableHighlight>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 20,
  },
  header: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  body: {
    flex: 3,
  },
  list: {
    borderWidth: 1,
    borderColor: '#ccc',
  },
  item: {
    backgroundColor: '#eee',
    flex: 1,
    flexDirection: 'column',
    margin: 5,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
  },
  itemId: {
    color: 'black',
    fontSize: 12,
  },
  itemName: {
    fontSize: 11
  },
  footer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  inputGroup: {
    flex: -1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingVertical: 5,
  },
  inputLabel: {
    textAlign: 'right',
    width: 80,
    fontSize: 12,
    marginRight: 7,
  },
  input: {
    flex:1,
    borderRadius: 5,
    borderWidth: 1,
    fontSize: 13,
    padding: 5,
    borderColor: '#ccc'
  },
  btnScan: {
    flex:0,
    borderWidth: 1,
    borderRadius: 7,
    borderColor: '#eee',
    backgroundColor: '#349beb',
    padding: 5,
    justifyContent: 'center',
  },
  btnScanText: {
    flex:0,
    textAlign: 'center',
    color: "#eee",
  },
  btnSend: {
    borderWidth: 1,
    borderRadius: 7,
    borderColor: '#eee',
    backgroundColor: '#3fc0e0',
    padding: 5,
  },
  btnSendText: {
    color: "#eee",
  },
});

// dhpark: store의 state를 해당 컴포넌트의 props로 전달
function mapStateToProps(state) {
  console.log('state:', state);
  return {
    ble: state.ble
  };
}

// dhpark: store의 dispatch를 props에 전달
function mapDispatchToProps(dispatch) {
  return {
    updateBleManager: (bleManager) => {
      dispatch(ActionCreator.updateBleManager(bleManager));
    },
    updateBleConnectedDevice: (device) => {
      dispatch(ActionCreator.updateBleConnectedDevice(device));
    },
    updateBleConnectedDeviceId: (deviceId) => {
      dispatch(ActionCreator.updateBleConnectedDeviceId(deviceId));
    },
    updateBleServiceUUIDs: (suuids) => {
      dispatch(ActionCreator.updateBleServiceUUIDs(suuids));
    },
    updateBleCharacteristicsUUID: (cuuid) => {
      dispatch(ActionCreator.updateBleCharacteristicsUUID(cuuid));
    }
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(React.memo(Ble));