import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("safety");
}

export default function Page() {
  return <CmsPage slug="safety" />;
}
