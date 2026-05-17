/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as commentBank from "../commentBank.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as lessonAgendas from "../lessonAgendas.js";
import type * as lessonExtraction from "../lessonExtraction.js";
import type * as lessonObservations from "../lessonObservations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_emailHtml from "../lib/emailHtml.js";
import type * as lib_observationHtml from "../lib/observationHtml.js";
import type * as narratives from "../narratives.js";
import type * as observationEmails from "../observationEmails.js";
import type * as observationQuestions from "../observationQuestions.js";
import type * as rosters from "../rosters.js";
import type * as students from "../students.js";
import type * as subjects from "../subjects.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  commentBank: typeof commentBank;
  emails: typeof emails;
  http: typeof http;
  imports: typeof imports;
  lessonAgendas: typeof lessonAgendas;
  lessonExtraction: typeof lessonExtraction;
  lessonObservations: typeof lessonObservations;
  "lib/auth": typeof lib_auth;
  "lib/emailHtml": typeof lib_emailHtml;
  "lib/observationHtml": typeof lib_observationHtml;
  narratives: typeof narratives;
  observationEmails: typeof observationEmails;
  observationQuestions: typeof observationQuestions;
  rosters: typeof rosters;
  students: typeof students;
  subjects: typeof subjects;
  users: typeof users;
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
