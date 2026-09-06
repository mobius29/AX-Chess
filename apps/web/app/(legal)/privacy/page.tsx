import { permanentRedirect } from "next/navigation";

export default function PrivacyRedirect() {
  permanentRedirect("/terms/privacy");
}
