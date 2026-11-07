# Website URL migration

Crawled from the live sitemaps on 7 Nov 2026 (`sitemap_index.xml`, 7 sitemaps, 140 URLs, all HTTP 200,
none noindex, none canonicalised elsewhere).

| File | What it is |
| --- | --- |
| `url-inventory.csv` | Every live URL with its title, meta description, H1, H1 count, word count, canonical. Source for carrying copy and metadata into the new pages. |
| `redirect-map.csv` | What happens to each old URL: `keep` (same path in the new site), `301` (permanent redirect to `new_path`), or `new page`. |

## Summary

| Old pages | Count | New site |
| --- | --- | --- |
| Home, About, Contact, List Your Property, Privacy, Colombo Apartment Report | 6 | kept |
| `/properties/` (archive) | 1 | kept; becomes the All Properties search page |
| Property listings | 81 | kept exactly: 32 `ax…` slugs and 49 `ref-…` slugs (Make.com era) |
| Location pages | 10 | kept (already the standard pattern) |
| Development pages | 18 | 10 kept, 8 redirected to the standard `/development/{dev}-apartments-for-sale-rent/` |
| Lifestyle pages | 3 | redirected to `/lifestyle/{penthouse,duplex,pet-friendly}-apartments-for-sale-rent/` |
| `/property-type/for-rent/`, `/for-sale/` | 2 | redirected to `/apartments-for-rent/`, `/apartments-for-sale/` (today those redirect the other way) |
| Facility pages | 19 | retired: pet-friendly and sea-view ones go to the matching lifestyle page, the rest to the hub |

New pages: `/apartments-for-sale-rent/` (hub, 404 today), `/apartments-for-rent/`, `/apartments-for-sale/`,
`/lifestyle/sea-view-apartments-for-sale-rent/`.

## Fix on the way

- None of the 82 property pages has an H1; 13 other pages (most development pages, About, Contact,
  List Your Property, both rent/sale pages, Privacy) have no single H1. Every new template has exactly one.
- Rented/sold listings: noindex, then 301 to their development page after 30 days (SEO architecture).

## Before launch

Re-crawl the live site the week of cutover (new listings appear daily), regenerate both files, and run
the redirect test: every row resolves to 200 or a single 301 to a 200 on the new site.
