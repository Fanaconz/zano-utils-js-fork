import * as crypto from 'crypto';

import {
  BUFFER_ADDRESS_LENGTH,
  CHECKSUM_LENGTH,
  FLAG_LENGTH,
  SPEND_KEY_LENGTH,
  TAG_LENGTH,
  VIEW_KEY_LENGTH,
  ADDRESS_REGEX,
  BYTES_FOR_PAYMENT_ID,
  BUFFER_INTEG_ADDRESS_LENGTH,
  INTEGRATED_ADDRESS_REGEX,
} from './constants';
import { ZarcanumAddressKeys } from './types';
import { base58Encode, base58Decode } from '../core/base58';
import {
  derivePublicKey,
  generateKeyDerivation,
  allocateEd25519Point,
  getChecksum,
} from '../core/crypto';

export class ZanoAddressUtils {

  // h * crypto::c_point_G + crypto::point_t(apa.spend_public_key)
  getStealthAddress(txPubKey: string, secViewKey: string, pubSpendKey: string, outIndex: number): string {
    const txPubKeyBuf: Buffer = Buffer.from(txPubKey, 'hex');
    const secViewKeyBuf: Buffer = Buffer.from(secViewKey, 'hex');
    const pubSpendKeyBuf: Buffer = Buffer.from(pubSpendKey, 'hex');

    const derivation: Buffer = allocateEd25519Point();
    generateKeyDerivation(derivation, txPubKeyBuf, secViewKeyBuf);
    const c_point_G: Buffer = allocateEd25519Point();
    derivePublicKey(c_point_G, derivation, outIndex, pubSpendKeyBuf);
    return c_point_G.toString('hex');
  }

  encodeAddress(tag: number, flag: number, spendPublicKey: string, viewPublicKey: string): string {
    try {
      if (tag < 0) {
        throw new Error('Invalid tag');
      }
      if (flag < 0) {
        throw new Error('Invalid flag');
      }
      let buf: Buffer = Buffer.from([tag, flag]);

      if (spendPublicKey.length !== 64 && !/^([0-9a-fA-F]{2})+$/.test(spendPublicKey)) {
        throw new Error('Invalid spendPublicKey: must be a hexadecimal string with a length of 64');
      }
      const spendKey: Buffer = Buffer.from(spendPublicKey, 'hex');
      if (viewPublicKey.length !== 64 && !/^([0-9a-fA-F]{2})+$/.test(viewPublicKey)) {
        throw new Error('Invalid viewPrivateKey: must be a hexadecimal string with a length of 64');
      }
      const viewKey: Buffer = Buffer.from(viewPublicKey, 'hex');
      buf = Buffer.concat([buf, spendKey, viewKey]);
      const hash: string = getChecksum(buf);
      return base58Encode(Buffer.concat([buf, Buffer.from(hash, 'hex')]));
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /*
  * Retrieves spend and view keys from the Zano address.
  *
  * @param address Zano address in Base58 format.
  * @returns The object containing the spend and view keys, or throws an error if the address is incorrect.
*/
  getKeysFromZarcanumAddress(address: string): ZarcanumAddressKeys {
    try {
      if (!ADDRESS_REGEX.test(address)) {
        throw new Error('Invalid Address format');
      }

      const buf: Buffer = base58Decode(address);

      if (buf.length !== BUFFER_ADDRESS_LENGTH) {
        throw new Error('Invalid buffer address length');
      }

      const addressWithoutChecksum: Buffer = Buffer.from(buf.buffer,  0, buf.length - CHECKSUM_LENGTH);
      const checksum: string = Buffer.from(buf.buffer,buf.length - CHECKSUM_LENGTH).toString('hex');

      if (checksum !== getChecksum(addressWithoutChecksum)) {
        throw new Error('Invalid address checksum');
      }

      const spendPublicKey: string = Buffer.from(
        buf.buffer,
        TAG_LENGTH + FLAG_LENGTH,
        SPEND_KEY_LENGTH,
      ).toString('hex');

      const viewPublicKey: string = Buffer.from(
        buf.buffer,
        TAG_LENGTH + FLAG_LENGTH + SPEND_KEY_LENGTH,
        VIEW_KEY_LENGTH,
      ).toString('hex');

      if (!spendPublicKey || spendPublicKey.length !== SPEND_KEY_LENGTH * 2 ||
        !viewPublicKey || viewPublicKey.length !== VIEW_KEY_LENGTH * 2) {
        throw new Error('Invalid key format in the address.');
      }
      return { spendPublicKey, viewPublicKey };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  private generatePaymentId(): string {
    return crypto.randomBytes(BYTES_FOR_PAYMENT_ID).toString('hex');
  }

  getIntegratedAddress(tag: number, flag: number, spendPublicKey: string, viewPublicKey: string): string {
    try {
      const paymentId: Buffer = Buffer.from(this.generatePaymentId(), 'hex'); //13
      const paymentIdC: Buffer = Buffer.from('3ba0527bcfb1fa93630d28eed6', 'hex'); //13
      // console.log('paymentIdC:', paymentIdC.length);
      // console.log('paymentId:', paymentId.length);
      if (tag < 0) {
        throw new Error('Invalid tag');
      }
      if (flag < 0) {
        throw new Error('Invalid flag');
      }
      let buf: Buffer = Buffer.from([tag, flag]); //2
      // console.log('buf1:', buf.length);
      if (spendPublicKey.length !== 64 && !/^([0-9a-fA-F]{2})+$/.test(spendPublicKey)) {
        throw new Error('Invalid spendPublicKey: must be a hexadecimal string with a length of 64');
      }
      const spendKey: Buffer = Buffer.from(spendPublicKey, 'hex'); //32
      // console.log('spendKey:', spendKey.length);
      if (viewPublicKey.length !== 64 && !/^([0-9a-fA-F]{2})+$/.test(viewPublicKey)) {
        throw new Error('Invalid viewPrivateKey: must be a hexadecimal string with a length of 64');
      }
      const viewKey: Buffer = Buffer.from(viewPublicKey, 'hex'); //32
      // console.log('viewKey:', viewKey.length);

      // console.log('Without id:', Buffer.concat([buf, spendKey, viewKey]).length);
      // console.log('With id:', Buffer.concat([buf, spendKey, viewKey, paymentId]).length);
      // console.log('With id from C++:', Buffer.concat([buf, spendKey, viewKey, paymentIdC]).length);

      buf = Buffer.concat([buf, spendKey, viewKey, paymentId]); //79
      const hash: string = getChecksum(buf); //8
      // console.log('hash:', hash);
      // console.log('buf2:', buf.length);
      // console.log('hash:', Buffer.from(hash, 'hex').length); //4
      // console.log('before base58Encode:', Buffer.concat([buf, Buffer.from(hash, 'hex')]).length); //83
      // console.log('base58Encode:', base58Encode(Buffer.concat([buf, Buffer.from(hash, 'hex')])).length); //115
      console.log('base58Encode hash:', base58Encode(Buffer.from(hash, 'hex')));
      console.log('base58Encode buf:', base58Encode(buf));
      return base58Encode(Buffer.concat([buf, Buffer.from(hash, 'hex')]));
    } catch (error) {
      throw new Error(error.message);
    }
  }

  getKeysFromIntegratedAddress(integratedAddress: string): ZarcanumAddressKeys {
    try {
      if (!INTEGRATED_ADDRESS_REGEX.test(integratedAddress)) {
        throw new Error('Invalid integrated address format');
      }

      const buf: Buffer = base58Decode(integratedAddress);
      if (buf.length !== BUFFER_INTEG_ADDRESS_LENGTH) {
        throw new Error('Invalid buffer integrated address length');
      }

      const addressWithoutChecksum: Buffer = Buffer.from(buf.buffer,  0, buf.length - CHECKSUM_LENGTH);
      const checksum: string = Buffer.from(buf.buffer,buf.length - CHECKSUM_LENGTH).toString('hex');

      if (checksum !== getChecksum(addressWithoutChecksum)) {
        throw new Error('Invalid address checksum');
      }

      const spendPublicKey: string = Buffer.from(
        buf.buffer,
        TAG_LENGTH + FLAG_LENGTH,
        SPEND_KEY_LENGTH,
      ).toString('hex');

      const viewPublicKey: string = Buffer.from(
        buf.buffer,
        TAG_LENGTH + FLAG_LENGTH + SPEND_KEY_LENGTH,
        VIEW_KEY_LENGTH,
      ).toString('hex');

      if (!spendPublicKey || spendPublicKey.length !== SPEND_KEY_LENGTH * 2 ||
        !viewPublicKey || viewPublicKey.length !== VIEW_KEY_LENGTH * 2) {
        throw new Error('Invalid key format in the address.');
      }
      return { spendPublicKey, viewPublicKey };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
