/**
 * Dial codes for the phone fields.
 *
 * Not exhaustive — it covers the countries this product is realistically
 * shared in, ordered by name so the list is scannable while scrolling.
 *
 * No flag emoji: Windows ships no country-flag glyphs, so they degrade to the
 * bare regional-indicator letters ("DZ", "AR") and look like a rendering bug.
 * The country name carries the meaning on every platform.
 *
 * Several countries share a dial code (+1 is the whole NANP, +7 is Russia and
 * Kazakhstan). A card stores the code, not the country, so a shared code shows
 * whichever entry comes first — hence POPULAR below, which puts the United
 * States ahead of Canada for +1.
 */
export const COUNTRIES = [
  { iso: 'DZ', name: 'Algeria', dial: '+213' },
  { iso: 'AR', name: 'Argentina', dial: '+54' },
  { iso: 'AU', name: 'Australia', dial: '+61' },
  { iso: 'AT', name: 'Austria', dial: '+43' },
  { iso: 'BH', name: 'Bahrain', dial: '+973' },
  { iso: 'BE', name: 'Belgium', dial: '+32' },
  { iso: 'BR', name: 'Brazil', dial: '+55' },
  { iso: 'CA', name: 'Canada', dial: '+1' },
  { iso: 'CL', name: 'Chile', dial: '+56' },
  { iso: 'CN', name: 'China', dial: '+86' },
  { iso: 'CO', name: 'Colombia', dial: '+57' },
  { iso: 'CI', name: 'Côte d’Ivoire', dial: '+225' },
  { iso: 'CZ', name: 'Czechia', dial: '+420' },
  { iso: 'DK', name: 'Denmark', dial: '+45' },
  { iso: 'EG', name: 'Egypt', dial: '+20' },
  { iso: 'FI', name: 'Finland', dial: '+358' },
  { iso: 'FR', name: 'France', dial: '+33' },
  { iso: 'DE', name: 'Germany', dial: '+49' },
  { iso: 'GH', name: 'Ghana', dial: '+233' },
  { iso: 'GR', name: 'Greece', dial: '+30' },
  { iso: 'HK', name: 'Hong Kong', dial: '+852' },
  { iso: 'HU', name: 'Hungary', dial: '+36' },
  { iso: 'IN', name: 'India', dial: '+91' },
  { iso: 'ID', name: 'Indonesia', dial: '+62' },
  { iso: 'IE', name: 'Ireland', dial: '+353' },
  { iso: 'IL', name: 'Israel', dial: '+972' },
  { iso: 'IT', name: 'Italy', dial: '+39' },
  { iso: 'JP', name: 'Japan', dial: '+81' },
  { iso: 'JO', name: 'Jordan', dial: '+962' },
  { iso: 'KE', name: 'Kenya', dial: '+254' },
  { iso: 'KW', name: 'Kuwait', dial: '+965' },
  { iso: 'LB', name: 'Lebanon', dial: '+961' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352' },
  { iso: 'MY', name: 'Malaysia', dial: '+60' },
  { iso: 'MX', name: 'Mexico', dial: '+52' },
  { iso: 'MA', name: 'Morocco', dial: '+212' },
  { iso: 'NL', name: 'Netherlands', dial: '+31' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64' },
  { iso: 'NG', name: 'Nigeria', dial: '+234' },
  { iso: 'NO', name: 'Norway', dial: '+47' },
  { iso: 'OM', name: 'Oman', dial: '+968' },
  { iso: 'PK', name: 'Pakistan', dial: '+92' },
  { iso: 'PE', name: 'Peru', dial: '+51' },
  { iso: 'PH', name: 'Philippines', dial: '+63' },
  { iso: 'PL', name: 'Poland', dial: '+48' },
  { iso: 'PT', name: 'Portugal', dial: '+351' },
  { iso: 'QA', name: 'Qatar', dial: '+974' },
  { iso: 'RO', name: 'Romania', dial: '+40' },
  { iso: 'RU', name: 'Russia', dial: '+7' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso: 'SN', name: 'Senegal', dial: '+221' },
  { iso: 'SG', name: 'Singapore', dial: '+65' },
  { iso: 'ZA', name: 'South Africa', dial: '+27' },
  { iso: 'KR', name: 'South Korea', dial: '+82' },
  { iso: 'ES', name: 'Spain', dial: '+34' },
  { iso: 'SE', name: 'Sweden', dial: '+46' },
  { iso: 'CH', name: 'Switzerland', dial: '+41' },
  { iso: 'TH', name: 'Thailand', dial: '+66' },
  { iso: 'TN', name: 'Tunisia', dial: '+216' },
  { iso: 'TR', name: 'Türkiye', dial: '+90' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso: 'US', name: 'United States', dial: '+1' },
  { iso: 'VN', name: 'Vietnam', dial: '+84' },
]

/** What a new card starts on. */
export const DEFAULT_DIAL = '+1'

/**
 * Shown above the full list, in this order. Two jobs: the codes people reach
 * for most are one scroll away, and the first entry for a shared code is the
 * one a select will display for it.
 */
export const POPULAR = ['US', 'GB', 'FR', 'MA', 'CA', 'DE', 'ES', 'AE', 'SA']

/**
 * Dial codes, longest first. Order matters: matching "+1" before "+212" would
 * claim a Moroccan number for the NANP, so the longest code always wins.
 */
export const DIAL_CODES = [...new Set(COUNTRIES.map((c) => c.dial))].sort(
  (a, b) => b.length - a.length
)
