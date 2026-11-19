import { z } from "zod";

const uuid = z.uuid();

/**
 * True for a well-formed id. Ids from forms are checked before they reach the
 * database, which would otherwise throw on a malformed one (an error page
 * instead of a quiet "not found").
 */
export const isUuid = (value: unknown): value is string => typeof value === "string" && uuid.safeParse(value).success;
