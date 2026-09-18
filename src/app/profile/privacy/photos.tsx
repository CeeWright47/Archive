import { HelperText, ProfilePage } from "@/components/settings";

const PHOTO_STORAGE_COPY =
  "Photos are stored privately with your Archive account. Only you can access them through your signed-in session.";

export default function PhotosPrivacyScreen() {
  return (
    <ProfilePage>
      <HelperText>{PHOTO_STORAGE_COPY}</HelperText>
    </ProfilePage>
  );
}
