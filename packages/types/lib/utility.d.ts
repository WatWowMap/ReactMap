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

/*
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
