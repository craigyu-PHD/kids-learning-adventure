import type { FamilyUserProfile, FamilyUserRole } from '../types';

export const userRoleOptions: Array<{ id: FamilyUserRole; label: string }> = [
  { id: 'father', label: '爸爸' },
  { id: 'mother', label: '媽媽' },
  { id: 'caregiver', label: '其他照顧者' },
  { id: 'other', label: '其他' },
];

export function normalizeUserRole(value?: string): FamilyUserRole {
  if (value === 'father' || value === 'mother' || value === 'caregiver' || value === 'other') return value;
  return 'caregiver';
}

export function roleLabel(role?: FamilyUserRole) {
  return userRoleOptions.find((option) => option.id === normalizeUserRole(role))?.label ?? '照顧者';
}

export function hasUserPin(user: FamilyUserProfile) {
  return Boolean(user.userPinHash && user.userPinSalt && (user.userPinIterations ?? 0) >= 100_000);
}

function caregiverArt(role: FamilyUserRole) {
  if (role === 'father') return 'avatar-father.webp';
  if (role === 'mother') return 'avatar-mother.webp';
  return 'avatar-caregiver.webp';
}

export function CaregiverAvatar({ user, size = 64 }: { user: FamilyUserProfile; size?: number }) {
  return <img className="caregiver-avatar" src={`${import.meta.env.BASE_URL}assets/v5/characters/caregivers/${caregiverArt(user.role)}`} alt={`${user.name}頭像`} width={size} height={size} loading="lazy" decoding="async" />;
}
