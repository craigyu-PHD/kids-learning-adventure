import AvatarRenderer, {
  avatarName,
  avatarOptions,
  avatarStageAssetPath,
  normalizeAvatarId,
} from './AvatarRenderer';

export { avatarName, avatarOptions, avatarStageAssetPath, normalizeAvatarId };

/**
 * Backward-compatible public component name. All character rendering is now
 * delegated to the single production AvatarRenderer.
 */
export default function AvatarHero(props: React.ComponentProps<typeof AvatarRenderer>) {
  return <AvatarRenderer {...props} />;
}
