/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as akun from "../akun.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as event from "../event.js";
import type * as kas from "../kas.js";
import type * as laporan from "../laporan.js";
import type * as lib from "../lib.js";
import type * as log from "../log.js";
import type * as pengajuan from "../pengajuan.js";
import type * as pengaturan from "../pengaturan.js";
import type * as transaksi from "../transaksi.js";
import type * as users from "../users.js";
import type * as warga from "../warga.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  akun: typeof akun;
  auth: typeof auth;
  crons: typeof crons;
  event: typeof event;
  kas: typeof kas;
  laporan: typeof laporan;
  lib: typeof lib;
  log: typeof log;
  pengajuan: typeof pengajuan;
  pengaturan: typeof pengaturan;
  transaksi: typeof transaksi;
  users: typeof users;
  warga: typeof warga;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
