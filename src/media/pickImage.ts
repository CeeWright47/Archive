import * as ImagePicker from "expo-image-picker";

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

function toPickedImage(
  result: ImagePicker.ImagePickerResult,
): PickedImage | null {
  if (result.canceled) return null;
  const [asset] = result.assets;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

function toPickedImages(result: ImagePicker.ImagePickerResult): PickedImage[] {
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  }));
}

export const pickImage = {
  async fromLibrary(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo library permission was not granted.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    return toPickedImage(result);
  },

  async manyFromLibrary(): Promise<PickedImage[]> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Photo library permission was not granted.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: true,
    });
    return toPickedImages(result);
  },

  async fromCamera(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Camera permission was not granted.");
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    return toPickedImage(result);
  },
};
