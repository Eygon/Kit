export enum PhotoContentTypeEnum {
  JPEG = "image/jpeg",
  PNG = "image/png",
  WEBP = "image/webp",
}

interface PhotoSignatureMarker {
  readonly offset: number;
  readonly bytes: readonly number[];
}

interface PhotoSignature {
  readonly contentType: PhotoContentTypeEnum;
  readonly markers: readonly PhotoSignatureMarker[];
}

const RIFF_MARKER: PhotoSignatureMarker = { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] };
const WEBP_FORMAT_OFFSET = 8;
const WEBP_FORMAT_MARKER: PhotoSignatureMarker = { offset: WEBP_FORMAT_OFFSET, bytes: [0x57, 0x45, 0x42, 0x50] };

export const PHOTO_SIGNATURES: readonly PhotoSignature[] = [
  { contentType: PhotoContentTypeEnum.JPEG, markers: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }] },
  { contentType: PhotoContentTypeEnum.PNG, markers: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }] },
  { contentType: PhotoContentTypeEnum.WEBP, markers: [RIFF_MARKER, WEBP_FORMAT_MARKER] },
];

const hasMarker = (content: Buffer, marker: PhotoSignatureMarker): boolean =>
  marker.bytes.every((byte, index) => content[marker.offset + index] === byte);

export const detectPhotoContentType = (content: Buffer): PhotoContentTypeEnum | null =>
  PHOTO_SIGNATURES.find((signature) => signature.markers.every((marker) => hasMarker(content, marker)))?.contentType ?? null;
