import Link from "next/link";
import type { HostelSearch } from "@/lib/hostels/search-params";
import type { University } from "@/lib/hostels/queries";
import { AMENITIES, GENDER_LABEL } from "@/lib/format";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

/**
 * Search filters as a plain GET form, so filtering works without JavaScript
 * and every result page has a shareable URL.
 */
export function FilterPanel({ filters, universities, idPrefix }: { filters: HostelSearch; universities: University[]; idPrefix: string }) {
  return (
    <form action="/hostels" method="get" className="space-y-5" aria-label="Filter hostels">
      {filters.sort !== "recommended" && <input type="hidden" name="sort" value={filters.sort} />}
      <Field idPrefix={idPrefix} label="Search" name="q">
        {(p) => <Input {...p} name="q" type="search" defaultValue={filters.q} placeholder="Hostel name or area" />}
      </Field>
      <Field idPrefix={idPrefix} label="University" name="university">
        {(p) => (
          <Select {...p} name="university" defaultValue={filters.university ?? ""}>
            <option value="">Any university</option>
            {universities.map((u) => (
              <option key={u.id} value={u.slug}>
                {u.shortName} · {u.city}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Price (GHS)</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${idPrefix}field-min`} className="sr-only">
              Minimum price
            </label>
            <Input id={`${idPrefix}field-min`} name="min" type="number" inputMode="numeric" min={0} step={100} placeholder="Min" defaultValue={filters.min} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}field-max`} className="sr-only">
              Maximum price
            </label>
            <Input id={`${idPrefix}field-max`} name="max" type="number" inputMode="numeric" min={0} step={100} placeholder="Max" defaultValue={filters.max} />
          </div>
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <Field idPrefix={idPrefix} label="Room size" name="occupancy">
          {(p) => (
            <Select {...p} name="occupancy" defaultValue={filters.occupancy ? String(filters.occupancy) : ""}>
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Single" : `${n} in a room`}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field idPrefix={idPrefix} label="Who can stay" name="gender">
          {(p) => (
            <Select {...p} name="gender" defaultValue={filters.gender ?? ""}>
              <option value="">Anyone</option>
              {Object.entries(GENDER_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Amenities</legend>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-1 xl:grid-cols-2">
          {Object.entries(AMENITIES).map(([key, label]) => (
            <Checkbox key={key} name="amenities" value={key} defaultChecked={filters.amenities.includes(key)} label={label} className="text-sm" />
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2 border-t border-line pt-4">
        <legend className="sr-only">Listing status</legend>
        <Checkbox name="available" value="1" defaultChecked={filters.available} label="Rooms available now" />
        <Checkbox name="verified" value="1" defaultChecked={filters.verified} label="Verified by StayNest" />
      </fieldset>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" className="flex-1">
          Show hostels
        </Button>
        <Link href="/hostels" className="text-sm font-medium text-muted hover:text-primary">
          Clear all
        </Link>
      </div>
    </form>
  );
}
