import { blob } from '@solana/buffer-layout';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Layout for a public key
 */
const publicKey = (property = 'publicKey') => {
  const publicKeyLayout: any = blob(32, property);

  const decode = publicKeyLayout.decode.bind(publicKeyLayout);
  const encode = publicKeyLayout.encode.bind(publicKeyLayout);

  publicKeyLayout.decode = (buffer, offset) => {
    const data = decode(buffer, offset);
    return new PublicKey(data);
  };

  publicKeyLayout.encode = (key, buffer, offset) => encode(key.toBuffer(), buffer, offset);

  return publicKeyLayout;
};

/**
 * Layout for a 64bit unsigned value
 */
const uint64 = (property = 'uint64') => {
  const layout: any = blob(8, property);

  const decode = layout.decode.bind(layout);
  const encode = layout.encode.bind(layout);

  layout.decode = (buffer, offset) => {
    const data = decode(buffer, offset);
    return new BN(
      [...data]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16,
    );
  };

  layout.encode = (num: any, buffer, offset) => {
    const a = num.toArray().reverse();
    let b = Buffer.from(a);
    if (b.length !== 8) {
      const zeroPad = Buffer.alloc(8);
      b.copy(zeroPad);
      b = zeroPad;
    }
    return encode(b, buffer, offset);
  };

  return layout;
};

const uint128 = (property = 'uint128') => {
  const layout: any = blob(16, property);

  const decode = layout.decode.bind(layout);
  const encode = layout.encode.bind(layout);

  layout.decode = (buffer, offset) => {
    const data = decode(buffer, offset);
    return new BN(
      [...data]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(''),
      16,
    );
  };

  layout.encode = (num: any, buffer, offset) => {
    const a = num.toArray().reverse();
    let b = Buffer.from(a);
    if (b.length !== 16) {
      const zeroPad = Buffer.alloc(16);
      b.copy(zeroPad);
      b = zeroPad;
    }

    return encode(b, buffer, offset);
  };

  return layout;
};

export { publicKey, uint64, uint128 };
