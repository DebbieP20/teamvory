/** Result of a form's server action, shown by the form (see components/forms). */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | {
      status: "error";
      message?: string;
      fieldErrors?: Record<string, string>;
      /** What the person typed, so the form can be refilled (never passwords). */
      values?: Record<string, string>;
    };

export const idleState: FormState = { status: "idle" };

export function errorState(
  message: string | undefined,
  fieldErrors?: Record<string, string>,
  values?: Record<string, string>,
): FormState {
  return { status: "error", message, fieldErrors, values };
}
