import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("terms");
}

export default function Page() {
  return <CmsPage slug="terms" />;
}
