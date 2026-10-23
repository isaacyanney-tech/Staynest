import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("contact");
}

export default function Page() {
  return <CmsPage slug="contact" />;
}
