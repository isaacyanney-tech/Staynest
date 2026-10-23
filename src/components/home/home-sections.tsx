import { findSection, getMediaByIds, getPublicSetting, type PublishedSection } from "@/lib/cms/queries";
import { getFeaturedHostels, getUniversities } from "@/lib/hostels/queries";
import { FeaturedHostels, Hero, HowItWorks, OwnerCta, PopularUniversities, Trust } from "./sections";

/** The homepage body, from published sections or, in the admin preview, from drafts. */
export async function HomeSections({ sections }: { sections: PublishedSection[] }) {
  const universities = await getUniversities();
  const featured = findSection(sections, "featured_hostels");
  const hero = findSection(sections, "hero");
  const slots = await getPublicSetting<number>("featured.homepage_slots", 6);
  const [hostels, heroMedia] = await Promise.all([
    featured ? getFeaturedHostels(Math.min(featured.limit, slots), featured.hostelSlugs) : Promise.resolve([]),
    hero?.mediaId ? getMediaByIds([hero.mediaId]) : Promise.resolve({} as Awaited<ReturnType<typeof getMediaByIds>>),
  ]);

  // Sections render in the order administrators set in the CMS.
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "hero":
            return (
              <Hero
                key={section.id}
                content={section.content}
                universities={universities}
                media={hero?.mediaId ? (heroMedia[hero.mediaId] ?? null) : null}
              />
            );
          case "popular_universities":
            return <PopularUniversities key={section.id} content={section.content} universities={universities} />;
          case "featured_hostels":
            return <FeaturedHostels key={section.id} content={section.content} hostels={hostels} />;
          case "how_it_works":
            return <HowItWorks key={section.id} content={section.content} />;
          case "trust":
            return <Trust key={section.id} content={section.content} />;
          case "cta":
            return <OwnerCta key={section.id} content={section.content} />;
          default:
            return null;
        }
      })}
    </>
  );
}
