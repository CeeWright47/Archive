import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_IMAGE_EDGE = 480;
const JPEG_QUALITY = 0.72;

export async function prepareAiImage(uri: string): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const longestEdge = Math.max(original.width, original.height);
  const context = ImageManipulator.manipulate(original);
  if (longestEdge > MAX_IMAGE_EDGE) {
    const scale = MAX_IMAGE_EDGE / longestEdge;
    context.resize({
      width: Math.round(original.width * scale),
      height: Math.round(original.height * scale),
    });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    base64: true,
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  if (!saved.base64) throw new Error("Couldn’t prepare the image.");
  return saved.base64;
}
