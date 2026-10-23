import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("about");
}

export default function Page() {
  return <CmsPage slug="about" />;
}
