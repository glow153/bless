import { Buffer } from 'buffer';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList,
  LogBox,
  PermissionsAndroid,
  Platform, StyleSheet, Text,
  TextInput,
  TouchableHighlight,
  View
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { connect } from 'react-redux';
import ActionCreator from '../actions';
import * as U from '../util';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const MAX_SCAN_TIME = 10000;

const Ble = React.memo((props) => {
  var bleMgr: BleManager = null;
  var _scanTime = 0;
  var _deviceList = [];
  const [isScanning, setScanning] = useState(false);
  const [scanTime, setScanTime] = useState(0);
  const [deviceList, setDeviceList] = useState(new Array());
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [serviceUUID, setServiceUUID] = useState("FFB0");
  const [characteristicsUUID, setCharacteristicsUUID] = useState("FFB5");
  const [packetText, setPacketText] = useState("0f 18 01");

  useEffect(() => {
    console.log('>> useEffect()');
    if (!bleMgr) {
      bleMgr = new BleManager();
      bleMgr.onStateChange((state) => {
        console.log('>> onStateChange:', state);
      });
      props.updateBleManager(bleMgr);
    }
    if (Platform.OS === 'android'){
      if (Platform.Version >= 23) {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
          if (result) {
            console.log("Permission is OK");
          } else {
            PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
              if (result) {
                console.log("User accept");
              } else {
                console.log("User refuse");
              }
            });
          }
        });
      } else {
        console.log("android version is under 23 :(")
      }
    }
    return () => {
      closeBleMgr();
    };
  }, []);

  const closeBleMgr = () => {
    console.log('>> closeBleMgr()');
    if (bleMgr) {
      bleMgr.cancelDeviceConnection(selectedDevice.id);
      bleMgr.destroy();
      bleMgr = null;
    }
  };

  const stopScan = () => {
    console.log('>> stopScan()');
    setScanning(false);
    bleMgr.stopDeviceScan();
    bleMgr.destroy();
    bleMgr = null;
  };

  const startScan = () => {
    console.log('>> startScan()');
    console.log('start scan...');
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
        if (_deviceList?.map(item => item.id).includes(device.id) === false) {
          _deviceList.push(device);
          setDeviceList(prevDeviceList => [...prevDeviceList, device]);
        }
      }

      if (Date.now() - _scanTime >= MAX_SCAN_TIME) {
        console.log("stop scanning...");
        stopScan();
        return;
      }
    });
  };

  const connectBleDevice = (device) => {
    console.log('>> connectBleDevice()');
    if (!bleMgr) {
      bleMgr = new BleManager();
    }
    bleMgr.connectToDevice(device.id, {autoConnect:true}).then((device: Device) => {
      (async () => {
        const services = await device.discoverAllServicesAndCharacteristics()
        const characteristic = await getServicesAndCharacteristics(services)
        // console.log(">> services:", services);
        // console.log(">> characteristic:", characteristic);
        // console.log(">> Discovering services and characteristics", characteristic.uuid);
        
        setSelectedDevice(device);
        props.updateBleConnectedDevice(device);
        props.updateBleConnectedDeviceId(device.id);

        // Initial packet sending
        sendPacket(device, "FFB0", "FFB6", "DAFE EA38 BB29 5A00 00").then(() => {
          return sendPacket(device, "FFB0", "FFBC", "1124 1311 0816 08");
        }).then(() => {
          console.log('@@@@@@@@ Successfully connected to', device.id, ',', device.name, '@@@@@@@@');
        });

      })();
      return device.discoverAllServicesAndCharacteristics();
    }).then((device) => {
      // return this.setupNotifications(device);
    }).then(() => {
      console.log("Listening...");
    }, (error) => {
      this.alert("Connection error"+JSON.stringify(error));
    })
  };

  const getServicesAndCharacteristics = (device: Device) => {
    return new Promise((resolve, reject) => {
      device.services().then(services => {
        const characteristics = []
        console.log("services:",services);
        services.forEach((service, i) => {
          service.characteristics().then(c => {
            console.log("service.characteristics")
            characteristics.push(c)
            if (i === services.length - 1) {
              const temp = characteristics.reduce(
                (acc, current) => {
                  return [...acc, ...current]
                },
                []
              )
              const dialog = temp.find(characteristic => characteristic.isWritableWithoutResponse)
              if (!dialog) {
                  reject('No writable characteristic')
              }
              resolve(dialog);
            }
          })
        })
      })
    })
  };

  const sendPacket = (device: Device, serviceUUID, characteristicsUUID, packet: String) => {
    console.log('>> sendPacket()');
    const suuid = serviceUUID;
    const cuuid = characteristicsUUID;
    const data = Buffer.from(U.hexToBytes(packet.replace(/ /g, ''))).toString('base64');
    
    return device.writeCharacteristicWithResponseForService(suuid, cuuid, data)
      .then((characteristic) => {
        console.log('characteristic:', characteristic);
        console.log('send packet:', serviceUUID, '-', characteristicsUUID, '-', data, `(${packet})`);
      }).catch((e) => {
        console.error('error occurred with send packet :', e);
      })
      ;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={{flex:1}}>블루투스 디바이스 찾기</Text>
        {isScanning ? <ActivityIndicator /> : null}
        <TouchableHighlight
          style={styles.btnScan}
          underlayColor='#ddd'
          activeOpacity={0.95}
          onPress={()=>{
            if (isScanning) {
              stopScan();
            } else {
              startScan();
            }
          }}>
          <Text style={styles.btnScanText}>{isScanning ? 'SCANNING...' : 'SCAN'}</Text>
        </TouchableHighlight>
      </View>
      <View style={styles.body}>
        <FlatList style={styles.list}
          data={deviceList}
          renderItem={({item}) => {
            return (
              <TouchableHighlight
                underlayColor='#ddd'
                activeOpacity={0.95}
                onPress={() => {
                  console.log("selected device :", item.id, item.name);
                  setSelectedDevice(item);
                  connectBleDevice(item);
                }}
                style={styles.item}>
                <>
                  <Text style={styles.itemId}>id: {item.id}</Text>
                  <Text style={[styles.itemName, {color: item.name ? 'black' : '#ccc'}]}>name: {item.name ?? 'N/A'}</Text>
                </>
              </TouchableHighlight>
            );
          }}
          keyExtractor={item => item.id} />
      </View>
      <View style={styles.footer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Device Id</Text>
          <TextInput value={selectedDevice?.id} style={styles.input}/>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ServiceUUID</Text>
          <TextInput value={serviceUUID} style={styles.input}/>
          <Text style={styles.inputLabel}>CharUUID</Text>
          <TextInput value={characteristicsUUID} style={styles.input}/>
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
            onPress={()=>{ sendPacket(selectedDevice, serviceUUID, characteristicsUUID, packetText); }}>
            <Text style={styles.btnSendText}>Send</Text>
          </TouchableHighlight>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    padding: 20,
  },
  header: {
    flex: -1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
    borderWidth: 1,
    borderRadius: 7,
    borderColor: '#eee',
    backgroundColor: '#349beb',
    padding: 5,
  },
  btnScanText: {
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

export default connect(mapStateToProps, mapDispatchToProps)(Ble);