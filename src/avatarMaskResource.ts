import { decodeAvatarImage } from './avatarImageDecode';

/** Keep the decoded bytes used by an image probe and by CSS masking identical.
 * A second HTTP request made by CSS can otherwise turn the entire body clear.
 */
export async function loadAvatarMaskResource(
  source: string,
  signal: AbortSignal,
  expected?: { width: number; height: number },
) {
  const response = await fetch(source, { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Avatar mask request failed (${response.status})`);
  const blob = await response.blob();
  if (signal.aborted) throw new DOMException('Avatar mask cancelled', 'AbortError');
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await decodeAvatarImage(image, () => !signal.aborted);
    if (image.naturalWidth <= 0 || (expected
      && (image.naturalWidth !== expected.width || image.naturalHeight !== expected.height))) {
      throw new Error('Avatar mask dimensions do not match its body');
    }
    return { url, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
