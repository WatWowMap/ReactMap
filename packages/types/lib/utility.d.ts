import type { Model } from 'objection'

export type SpecificValueType<T, U, V> = {
  [k in keyof T]: T[k] extends U
    ? V extends true
      ? k
      : never
    : V extends true
      ? never
      : k
}[keyof T]

/**
 * OnlyType<T, U, V> - returns a type with only the keys of T that have a value of U
 */
export type OnlyType<T, U, V = true> = {
  [K in SpecificValueType<T, U, V>]: T[K]
}

export type StoreNoFn<T> = keyof OnlyType<T, Function, false>

export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S]

export type PickMatching<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

export type ExtractMethods<T> = PickMatching<T, Function>

export type Head<T extends any[]> = T extends [...infer Head, any]
  ? Head
  : any[]

export type ModelReturn<T extends Model, U extends keyof T> = Awaited<
  ReturnType<T[U]>
>

export type FullModel<T, U extends Model> = Partial<T> & U

export type IsAny<T> = 0 extends 1 & T ? true : false

export type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof U
    ? IsAny<T[K]> extends true
      ? U[K] // If T[K] is any, override with U[K]
      : U[K] extends any[]
        ? T[K] extends any[]
          ? T[K] extends object[]
            ? U[K] extends object[]
              ? Array<DeepMerge<T[K][number], U[K][number]>> // Merge arrays of objects
              : U[K] // If U is not an array of objects, override
            : U[K] // If T is not an array of objects, override
          : U[K] // If T is not an array, override
        : U[K] extends object
          ? K extends keyof T
            ? T[K] extends object
              ? DeepMerge<T[K], U[K]> // Recursively merge objects
              : U[K] // Otherwise, use U's value
            : U[K] // If the key exists only in U
          : U[K] // If U[K] is not an object, use U's value
    : K extends keyof T
      ? T[K]
      : never
}

export type ComparisonReport<T> =
  T extends Array<infer U>
    ? { areEqual: boolean; report: ComparisonReport<U>[]; changed: Paths<T>[] }
    : T extends object
      ? {
          areEqual: boolean
          report: { [K in StoreNoFn<T>]: ComparisonReport<T[K]> }
          changed: Paths<T>[]
        }
      : boolean

export type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

export type Paths<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | Join<K, Paths<T[K]>>
        : never
    }[keyof T]
  : ''

export type ObjectPathValue<
  O,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof O
    ? ObjectPathValue<O[K], Rest>
    : never
  : P extends keyof O
    ? O[P]
    : never
