import type { SyntheticEvent } from 'react';
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

/** Existing V5 artwork, with lossless display variants and the original fallback. */
export function caregiverImageProps(role: FamilyUserRole) {
  const file = caregiverArt(role);
  const base = import.meta.env.BASE_URL;
  return {
    src: `${base}assets/v5/characters/caregivers/${file}`,
    srcSet: [128, 256, 512].map(width =>
      `${base}assets/v6.4/caregiver-display/${file.replace('.webp', `-${width}.webp`)} ${width}w`)
      .concat(`${base}assets/v5/characters/caregivers/${file} 1024w`).join(', '),
    onError: (event: SyntheticEvent<HTMLImageElement>) => { event.currentTarget.removeAttribute('srcset'); },
  };
}

export function CaregiverAvatar({ user, size = 64 }: { user: FamilyUserProfile; size?: number }) {
  return <img className="caregiver-avatar" {...caregiverImageProps(user.role)} sizes={`${size}px`} alt={`${user.name}頭像`} width={size} height={size} loading="eager" decoding="async" />;
}
