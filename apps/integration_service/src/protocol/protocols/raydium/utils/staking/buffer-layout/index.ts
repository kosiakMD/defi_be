import BN from "bn.js";

import { PublicKey } from "@solana/web3.js";
import {
  blob, Layout, offset as _offset, seq as _seq, Structure as _Structure, u32 as _u32,
  u8 as _u8, UInt, union as _union, Union as _Union,
} from "./buffer-layout";

export * from "./buffer-layout";
export { blob };

export class BNLayout<P extends string = ""> extends Layout<BN, P> {
  blob: Layout<Buffer>;
  signed: boolean;

  constructor(span: number, signed: boolean, property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends, but it desn't matter
    super(span, property);
    this.blob = blob(span);
    this.signed = signed;
  }

  /** @override */
  decode(b: Buffer, offset = 0) {
    const num = new BN(this.blob.decode(b, offset), 10, "le");
    if (this.signed) {
      return num.fromTwos(this.span * 8).clone();
    }
    return num;
  }

  /** @override */
  encode(src: BN, b: Buffer, offset = 0) {
    if (typeof src === "number") src = new BN(src); // src will pass a number accidently in union
    if (this.signed) {
      src = src.toTwos(this.span * 8);
    }
    return this.blob.encode(src.toArrayLike(Buffer, "le", this.span), b, offset);
  }
}

export function u8<P extends string = "">(property?: P): UInt<number, P> {
  return new UInt(1, property);
}

export function u32<P extends string = "">(property?: P): UInt<number, P> {
  return new UInt(4, property);
}

export function u64<P extends string = "">(property?: P): BNLayout<P> {
  return new BNLayout(8, false, property);
}

export function u128<P extends string = "">(property?: P): BNLayout<P> {
  return new BNLayout(16, false, property);
}

export class WrappedLayout<T, U, P extends string = ""> extends Layout<U, P> {
  layout: Layout<T>;
  decoder: (data: T) => U;
  encoder: (src: U) => T;

  constructor(layout: Layout<T>, decoder: (data: T) => U, encoder: (src: U) => T, property?: P) {
    //@ts-expect-error type wrong for super()'s type different from extends , but it desn't matter
    super(layout.span, property);
    this.layout = layout;
    this.decoder = decoder;
    this.encoder = encoder;
  }

  decode(b: Buffer, offset?: number): U {
    return this.decoder(this.layout.decode(b, offset));
  }

  encode(src: U, b: Buffer, offset?: number): number {
    return this.layout.encode(this.encoder(src), b, offset);
  }

  getSpan(b: Buffer, offset?: number): number {
    return this.layout.getSpan(b, offset);
  }
}

export function publicKey<P extends string = "">(property?: P): Layout<PublicKey, P> {
  return new WrappedLayout(
    blob(32),
    (b: Buffer) => new PublicKey(b),
    (key: PublicKey) => key.toBuffer(),
    property,
  );
}

export class Structure<T, P, D> extends _Structure<T, P, D> {
  /** @override */
  decode(b: Buffer, offset?: number) {
    return super.decode(b, offset);
  }
}

export function struct<T, P extends string = "">(
  fields: T,
  property?: P,
  decodePrefixes?: boolean,
): T extends Layout<infer Value, infer Property>[]
  ? Structure<
      Value,
      P,
      {
        [K in Exclude<Extract<Property, string>, "">]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any>
          ? V
          : any;
      }
    >
  : any {
  //@ts-expect-error this type is not quite satisfied the define, but, never no need to worry about.
  return new Structure(fields, property, decodePrefixes);
}