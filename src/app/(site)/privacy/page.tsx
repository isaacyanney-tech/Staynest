import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("privacy");
}

export default function Page() {
  return <CmsPage slug="privacy" />;
}
