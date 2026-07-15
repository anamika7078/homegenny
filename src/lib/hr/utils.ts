/** Unwrap NestJS `{ success, data }` or paginated `{ items }` responses. */
export function unwrapData<T = any>(payload: unknown): T | undefined {
  if (payload == null) return undefined;
  if (Array.isArray(payload)) return payload as T;

  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.items)) return root.items as T;
  if (root.data !== undefined && root.data !== null) return unwrapData<T>(root.data);

  return payload as T;
}

export function unwrapItems(payload: unknown): any[] {
  if (payload == null) return [];

  const data = unwrapData(payload);
  if (data == null) return [];
  if (Array.isArray(data)) return data;

  const nested = data as Record<string, unknown>;
  if (nested && Array.isArray(nested.items)) return nested.items as any[];

  return [];
}

export const HR_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

export const DOC_TYPE_TO_API: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  photo: 'Passport Size Photo',
  police_verification: 'Police Verification Certificate',
  driving_license: 'Driving License',
};

export const DOC_TYPE_FROM_API: Record<string, string> = {
  'Aadhaar Card': 'aadhaar',
  'PAN Card': 'pan',
  'Passport Size Photo': 'photo',
  'Police Verification Certificate': 'police_verification',
  'Driving License': 'driving_license',
};

export const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  photo: 'Passport Photo',
  police_verification: 'Police Verification',
  driving_license: 'Driving License',
};
