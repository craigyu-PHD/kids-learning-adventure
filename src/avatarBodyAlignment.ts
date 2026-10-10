/** Whole-look Y translations measured from the current full-skin eye line.
 * They move the body and every equipment layer together, without rescaling.
 * Source hashes are checked by the admission gate; a new path gets no offset.
 */
export const avatarBodyAlignment = [
  {
    "path": "assets/v6.5.2/runtime/brother/outfit-racer--native-20260927.webp",
    "sourceSHA256": "790cd8375a0da3113536fa447b6a8b5f5ca38cd920913cab029dd28eb0c2206c",
    "offsetY": -8.25,
    "avatarId": "brother",
    "skinId": "outfit-racer"
  },
  {
    "path": "assets/v6.5/runtime/younger/outfit-cadet.webp",
    "sourceSHA256": "ea7db723197aca01a3dde4917e733876c3c65c712221561929aa28492ae92c77",
    "offsetY": 10.75,
    "avatarId": "younger",
    "skinId": "outfit-cadet"
  },
  {
    "path": "assets/v6.5/runtime/younger/outfit-legend.webp",
    "sourceSHA256": "2fe559275a79869ea3f494b67b92dcf132afb4b5a707e04944ad730a6f5e88ee",
    "offsetY": 31.0,
    "avatarId": "younger",
    "skinId": "outfit-legend"
  },
  {
    "path": "assets/v6.5/runtime/sister/outfit-mecha.webp",
    "sourceSHA256": "2eda1fcf553a69eae4ead68723e4ed970e2c5fa78c1f56272cd27a2660280b3a",
    "offsetY": 19.0,
    "avatarId": "sister",
    "skinId": "outfit-mecha"
  },
  {
    "path": "assets/v6.5.2/runtime/younger-sister/outfit-racer--native-20260927.webp",
    "sourceSHA256": "93f63905c85868e8ccafd9f10d604421ae42ab3bbc34d99c900effa2b1139e9e",
    "offsetY": 9.25,
    "avatarId": "younger-sister",
    "skinId": "outfit-racer"
  }
] as const;

export function avatarBodyOffsetY(path: string | undefined): number {
  if (!path) return 0;
  const pathname = path.split(/[?#]/, 1)[0];
  return avatarBodyAlignment.find(entry => pathname.endsWith('/' + entry.path))?.offsetY ?? 0;
}
