import { CmsPage, cmsMetadata } from "@/components/cms/cms-page";

export function generateMetadata() {
  return cmsMetadata("faq");
}

export default function Page() {
  return <CmsPage slug="faq" />;
}
