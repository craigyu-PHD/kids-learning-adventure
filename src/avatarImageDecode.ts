/** Require a successful decode of this exact image; recover one transient rejection. */
export async function decodeAvatarImage(image: HTMLImageElement, isCurrent: () => boolean) {
  const source = image.src;
  const current = () => isCurrent() && image.src === source;
  const requireCurrent = () => {
    if (!current()) throw new DOMException('Avatar image was replaced or cancelled', 'AbortError');
  };
  requireCurrent();
  try {
    await image.decode();
  } catch (error) {
    const transient = error instanceof DOMException
      && (error.name === 'EncodingError' || error.name === 'AbortError');
    if (!current() || !transient || !image.complete
      || image.naturalWidth <= 0 || image.naturalHeight <= 0) throw error;
    // Yield once so a cached image can finish decoding. A second rejection fails
    // normally; complete/natural dimensions alone never activate a layer.
    await new Promise<void>(resume => setTimeout(resume, 0));
    requireCurrent();
    await image.decode();
  }
  requireCurrent();
}

