import { signal, computed, batch } from "../reactive.js";

const blank = value => value == null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length);

export const required = (message = "Required") => value => (blank(value) ? message : null);

export const minLength = (length, message) => value =>
  !blank(value) && String(value).trim().length < length ? message ?? `Use at least ${length} characters` : null;

export const maxLength = (length, message) => value =>
  String(value ?? "").length > length ? message ?? `Use ${length} characters or fewer` : null;

export const pattern = (regex, message = "Check the format") => value =>
  !blank(value) && !regex.test(String(value)) ? message : null;

export const email = (message = "Enter a valid email address") => pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message);

export const min = (limit, message) => value =>
  !blank(value) && Number(value) < limit ? message ?? `Use ${limit} or more` : null;

export const max = (limit, message) => value =>
  !blank(value) && Number(value) > limit ? message ?? `Use ${limit} or less` : null;

export function form(spec) {
  const submitted = signal(false);
  const submitting = signal(false);
  const fields = {};

  const values = () => Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value.value]));
  const snapshot = () => Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value.peek()]));

  for (const [name, definition] of Object.entries(spec)) {
    const config = definition !== null && typeof definition === "object" && !Array.isArray(definition) && "value" in definition
      ? definition
      : { value: definition };
    const rules = config.rules ?? [];
    const value = signal(config.value);
    const touched = signal(false);
    const problem = computed(() => {
      for (const rule of rules) {
        const message = rule(value.value, values());
        if (message) return message;
      }
      return null;
    });
    fields[name] = {
      name,
      value,
      touched,
      problem,
      initial: config.value,
      element: null,
      error: computed(() => (touched.value || submitted.value ? problem.value : null)),
      touch: () => { touched.value = true; }
    };
  }

  const list = Object.values(fields);
  const valid = computed(() => list.every(field => !field.problem.value));
  const dirty = computed(() => list.some(field => field.value.value !== field.initial));

  const reset = (next = {}) => batch(() => {
    submitted.value = false;
    for (const field of list) {
      field.value.value = field.name in next ? next[field.name] : field.initial;
      field.touched.value = false;
    }
  });

  const submit = handler => async event => {
    event?.preventDefault?.();
    submitted.value = true;
    if (!valid.peek()) {
      list.find(field => field.problem.peek())?.element?.focus();
      return false;
    }
    submitting.value = true;
    try {
      await handler(snapshot());
      return true;
    } finally {
      submitting.value = false;
    }
  };

  return { fields, valid, dirty, submitted, submitting, values: snapshot, reset, submit };
}
