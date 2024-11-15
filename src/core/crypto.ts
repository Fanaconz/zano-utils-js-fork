import * as sha3 from 'js-sha3';
import createKeccakHash from 'keccak';
import sodium from 'sodium-native';

import { serializeVarUint } from './serialize';

const ADDRESS_CHECKSUM_SIZE = 8;
const EC_POINT_SIZE: number = sodium.crypto_core_ed25519_BYTES;
const EC_SCALAR_SIZE: number = sodium.crypto_core_ed25519_SCALARBYTES;
const ZERO: Buffer = allocateEd25519Scalar();
const EIGHT: Buffer = allocateEd25519Scalar().fill(8, 0, 1);

export function getChecksum(buffer: Buffer): string {
  return sha3.keccak_256(buffer).substring(0, ADDRESS_CHECKSUM_SIZE);
}

// Hs(8 * r * V, i)
export function getDerivationToScalar(txPubKey: string, secViewKey: string, outIndex: number): Buffer {
  const txPubKeyBuf: Buffer = Buffer.from(txPubKey, 'hex');
  const secViewKeyBuf: Buffer = Buffer.from(secViewKey, 'hex');

  const sharedSecret: Buffer = allocateEd25519Point();
  generateKeyDerivation(sharedSecret, txPubKeyBuf, secViewKeyBuf);

  const scalar: Buffer = allocateEd25519Scalar();
  derivationToScalar(scalar, sharedSecret, outIndex);

  return scalar;
}

export function calculateConcealingPoint(Hs: Buffer, pubViewKeyBuff: Buffer): Buffer {
  const concealingPoint = allocateEd25519Point();
  sodium.crypto_scalarmult_ed25519_noclamp(concealingPoint, Hs,  pubViewKeyBuff);
  return concealingPoint;
}

export function generateKeyDerivation(derivation: Buffer, txPubKey: Buffer, secKeyView: Buffer): void {
  sodium.crypto_scalarmult_ed25519_noclamp(derivation, secKeyView, txPubKey);
  sodium.crypto_scalarmult_ed25519_noclamp(derivation, EIGHT, derivation);
}

// h * crypto::c_point_G + crypto::point_t(spend_public_key)
export function derivePublicKey(
  c_point_G: Buffer,
  derivation: Buffer,
  outIndex: number,
  pubSpendKeyBuf: Buffer,
): void {
  derivationToScalar(c_point_G, derivation, outIndex); // h = Hs(8 * r * V, i)
  sodium.crypto_scalarmult_ed25519_base_noclamp(c_point_G, c_point_G);
  sodium.crypto_core_ed25519_add(c_point_G, pubSpendKeyBuf, c_point_G);
}

function derivationToScalar(scalar: Buffer, derivation: Buffer, outIndex: number): void {
  const data = Buffer.concat([
    derivation,
    serializeVarUint(outIndex),
  ]);
  hashToScalar(scalar, data);
}

function fastHash(data: Buffer): Buffer {
  const hash: Buffer = createKeccakHash('keccak256').update(data).digest();
  return hash;
}

export function hs(str32: Buffer, h: Buffer): Buffer {
  const elements: Buffer[] = [str32, h];
  const hashScalar: Buffer = allocateEd25519Scalar();
  const data: Buffer = Buffer.concat(elements);
  hashToScalar(hashScalar, data);
  return hashScalar;
}

function hashToScalar(scalar: Buffer, data: Buffer): void {
  const hash: Buffer = Buffer.concat([fastHash(data), ZERO]);
  sodium.crypto_core_ed25519_scalar_reduce(scalar, hash);
}

export function allocateEd25519Scalar(): Buffer {
  return Buffer.alloc(EC_SCALAR_SIZE);
}

export function allocateEd25519Point(): Buffer {
  return Buffer.alloc(EC_POINT_SIZE);
}
