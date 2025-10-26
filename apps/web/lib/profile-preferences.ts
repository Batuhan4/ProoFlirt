export const GENDER_OPTIONS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary" },
  { value: "unspecified", label: "Prefer not to say" }
] as const;

export const MATCH_PREFERENCE_OPTIONS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "non-binary", label: "Non-binary" },
  { value: "any", label: "All genders" }
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];
export type MatchPreferenceValue = (typeof MATCH_PREFERENCE_OPTIONS)[number]["value"];

export function resolveGenderLabel(value?: string | null) {
  if (!value) return null;
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function resolveMatchPreferenceLabel(value?: string | null) {
  if (!value) return null;
  return MATCH_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
