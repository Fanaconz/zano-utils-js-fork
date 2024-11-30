export const TAG_LENGTH = 1;
export const FLAG_LENGTH = 1;
export const SPEND_KEY_LENGTH = 32;
export const VIEW_KEY_LENGTH = 32;
export const CHECKSUM_LENGTH = 4;
export const BUFFER_ADDRESS_LENGTH: number =
  TAG_LENGTH +
  FLAG_LENGTH +
  SPEND_KEY_LENGTH +
  VIEW_KEY_LENGTH +
  CHECKSUM_LENGTH;
export const ADDRESS_REGEX = /^Z[a-zA-Z0-9]{96}$/;
export const INTEGRATED_ADDRESS_REGEX = /^iZ[a-zA-Z0-9]{106}$/;
export const PAYMENT_ID_LENGTH = 4;
export const PAYMENT_ID_REGEX = /^[a-zA-Z0-9]{8}$/;
export const INTEGRATED_ADDRESS_FLAG_PREFIX = 0x6c;
export const INTEGRATED_ADDRESS_TAG_PREFIX = 0xf8;
export const BUFFER_INTEGRATED_ADDRESS_LENGTH =
  BUFFER_ADDRESS_LENGTH +
  PAYMENT_ID_LENGTH;
