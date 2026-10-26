// The six required genres. `slug` is the URL segment for /genre/:genre.
export const GENRES = [
  { slug: 'adventure', label: 'Adventure' },
  { slug: 'technology', label: 'Technology' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'sci-fi', label: 'Sci-Fi' },
  { slug: 'fiction', label: 'Fiction' },
  { slug: 'non-fiction', label: 'Non-Fiction' },
]

export const findGenre = (slug) => GENRES.find((g) => g.slug === slug)
