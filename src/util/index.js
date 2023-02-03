import { Buffer } from 'buffer';
import moment from 'moment';
import 'moment/locale/ko';
moment.locale();

export const tryCall = function (fn, ...args) {
  return fn instanceof Function && fn.apply(this, args);
};

// Convert a hex string to a byte array
export function hexToBytes(hex) {
  if (hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
  }
}

// Convert a byte array to a hex string
export function bytesToHex(bytes) {
  for (var hex = [], i = 0; i < bytes.length; i++) {
    var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex.push((current >>> 4).toString(16));
    hex.push((current & 0xF).toString(16));
  }
  return hex.join("");
}

export const base64ToBytes = (b64str) => {
  return Array.from(Buffer.from(b64str, 'base64'));
};

export const base64ToHex = (b64str) => {
  return bytesToHex(base64ToBytes(b64str))
};

export const hexToBase64 = (hex) => {
  return Buffer.from(hexToBytes(hex.replace(/ /g, ''))).toString('base64');
}

export const getCurrentTimePacket = () => {
  const today = new Date();
  const date = moment(today)
    .format('ss.mm.HH.DD.MM.YY')
    .split('.')
    .map(b => {
      const r = parseInt(b).toString(16);
      return r.length < 2 ? "0" + r : r;
    })
    .join('');

  const dayofweek = ((1 << today.getDay()) & 255).toString(16);
  return date + dayofweek;
}

export const delay = (ms) => {
  return new Promise((resolve) => setTimeout(() => resolve(), ms));
}

export const dateObjToTimestamp = (dt, format = 'YYYY-MM-DD HH:mm:ss') => {
  const dateObj = dt instanceof Date ? moment(dt) : moment(new Date());
  return dateObj.format(format);
};
