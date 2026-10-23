import type { Metadata } from "next";
import { getPage } from "@/lib/cms/queries";
import { HomeSections } from "@/components/home/home-sections";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  // Omit unset fields so the root layout's defaults apply.
  const metadata: Metadata = {};
  if (page?.seo_title) metadata.title = { absolute: page.seo_title };
  if (page?.seo_description) metadata.description = page.seo_description;
  return metadata;
}

export default async function HomePage() {
  const page = await getPage("home");
  return <HomeSections sections={page?.sections ?? []} />;
}
