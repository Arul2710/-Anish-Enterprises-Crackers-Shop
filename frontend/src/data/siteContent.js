export const siteContentStorageKey = 'spark-shine-site-content';

// Bump whenever the published business identity changes. Stored copies saved
// before the current version get their identity fields re-seeded from the
// defaults below, while edits made through the admin area after the bump
// are preserved. Version 4 adds the second published phone number, so a copy
// saved before it exists cannot keep serving the single old line.
export const siteContentVersion = 4;

// Identity fields the shop owns. These are re-seeded on a version bump even if
// an older stored copy holds blank or placeholder values. The published social
// profiles are included so a copy saved before the links were supplied cannot
// keep serving an older or unverified profile to visitors.
const identityContactFields = ['businessName', 'phone', 'phoneAlt', 'email', 'address', 'mapUrl', 'mapEmbedUrl'];
const identitySocialFields = ['instagram', 'facebook', 'youtube', 'whatsapp'];

export const siteContentDefaults = {
  announcement: {
    enabled: true,
    text: 'Enquiry based ordering · Availability confirmed by our team',
  },
  contact: {
    businessName: 'Anish Enterprises',
    // The website contact line. This is deliberately NOT the WhatsApp number below:
    // the two are separate numbers and must not be swapped.
    phone: '9488821144',
    // The second shop number. Both lines are published, so both are shown on the contact
    // page and in the footer with this one listed first, and neither replaces the other.
    phoneAlt: '9442521144',
    email: 'anishenterprisessvk@gmail.com',
    address: 'Kamak Road, Near Kamavar Kalyanamandapam',
    city: '',
    state: '',
    businessHours: '',
    mapUrl: 'https://maps.app.goo.gl/n8QT6EUq98P87LnV9?g_st=ac',
    // Google blocks framing maps.app.goo.gl share links, so the contact page
    // embeds this pre-resolved coordinates URL instead. Bump detailsVersion when
    // the shop location changes so both links stay in step.
    mapEmbedUrl: 'https://www.google.com/maps?q=9.446091,77.8052485&z=16&output=embed',
  },
  // The shop's published brand accounts, stored exactly as supplied. These are the
  // links the owner provided, including the Instagram stkn and YouTube si tokens.
  // whatsapp is the floating chat button's number and is intentionally different
  // from contact.phone above.
  social: {
    instagram: 'https://www.instagram.com/anishenterprisescrackers?stkn=MXV6c29xMnoza3NiYw==',
    facebook: 'https://www.facebook.com/share/1AjwdKkQQx/',
    linkedin: '',
    whatsapp: 'https://wa.me/919442521144',
    youtube: 'https://youtube.com/@anishenterprisescrackers?si=tBZtvWu7Bwgg_ZyV',
  },
  hero: {
    eyebrow: 'The 2026 festive edit',
    title: 'Make the night unforgettable.',
    description: 'Browse the supplied 2026 crackers catalog, shortlist what you like, and send a single enquiry. Our team confirms price, pack details and availability before anything is dispatched.',
  },
  serviceHighlights: [
    { id: 'fast-delivery', title: 'Fast Delivery', copy: 'Your parcel will be delivered 3 to 5 working days' },
    { id: 'best-deals', title: 'Best Deals', copy: 'We provide up to 80% discount on all products' },
    { id: 'packaging', title: 'Packaging', copy: 'Goods will be packed in poly bundle carton box' },
    { id: 'working-hours', title: 'Working Hours', copy: 'Sunday to Saturday 8.00 AM to 8.00 PM' },
  ],
  contentNote: 'Sections that need real business data (contact details, testimonials, videos, policies) are left empty on purpose and can be filled from the admin area.',
};

const defaultHighlightIds = siteContentDefaults.serviceHighlights.map((highlight) => highlight.id);

// Re-seeds the four service highlight cards when stored data predates the current
// set, so every visitor sees the agreed copy instead of a stale variant.
const mergeHighlights = (value) => {
  const stored = value?.serviceHighlights;
  if (!Array.isArray(stored) || !stored.length) return siteContentDefaults.serviceHighlights;
  const storedIds = stored.map((highlight) => highlight?.id);
  const matchesCurrentSet =
    stored.length === defaultHighlightIds.length && defaultHighlightIds.every((id) => storedIds.includes(id));
  return matchesCurrentSet ? stored : siteContentDefaults.serviceHighlights;
};

// A stored copy older than the current version predates the published business
// details, so the identity fields are refreshed from the defaults. Everything
// else the admin has saved is left untouched.
const isStaleCopy = (value) => (Number(value?.detailsVersion) || 0) < siteContentVersion;

const mergeContact = (value) => {
  const merged = { ...siteContentDefaults.contact, ...(value?.contact || {}) };
  if (!isStaleCopy(value)) return merged;
  for (const field of identityContactFields) merged[field] = siteContentDefaults.contact[field];
  return merged;
};

const mergeSocial = (value) => {
  const merged = { ...siteContentDefaults.social, ...(value?.social || {}) };
  if (!isStaleCopy(value)) return merged;
  for (const field of identitySocialFields) merged[field] = siteContentDefaults.social[field];
  return merged;
};

export const mergeSiteContent = (value) => ({
  ...siteContentDefaults,
  ...(value && typeof value === 'object' ? value : {}),
  detailsVersion: siteContentVersion,
  announcement: { ...siteContentDefaults.announcement, ...(value?.announcement || {}) },
  contact: mergeContact(value),
  social: mergeSocial(value),
  hero: { ...siteContentDefaults.hero, ...(value?.hero || {}) },
  serviceHighlights: mergeHighlights(value),
});

export const socialPlatforms = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'youtube', label: 'YouTube' },
];

/**
 * Where each platform's own website lives. The shop's own account is set in the admin
 * panel, so these are only the fallback that keeps a brand icon pointing somewhere real
 * before a handle has been published - a platform home page rather than a guessed
 * profile, since inventing a handle would send customers to the wrong account.
 */
export const socialPlatformHomeUrls = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  youtube: 'https://www.youtube.com/',
};

/** A bare @handle is only meaningful on its own platform, so each one is expanded. */
const socialHandleUrls = {
  instagram: (handle) => `https://www.instagram.com/${handle}`,
  facebook: (handle) => `https://www.facebook.com/${handle}`,
  linkedin: (handle) => `https://www.linkedin.com/company/${handle}`,
  youtube: (handle) => `https://www.youtube.com/${handle}`,
};

/**
 * Turns whatever was typed into the admin social fields into a URL that actually
 * opens. Owners paste from a phone, so a bare handle, a bare domain or a WhatsApp
 * number all turn up; each is completed here rather than left as a dead link.
 */
export const normalizeSocialUrl = (key, value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (key === 'whatsapp') {
    const digits = raw.replace(/\D/g, '');
    // A number typed into the field becomes a wa.me link. Anything with a host in it
    // is already a link and is left alone.
    const looksLikeBareNumber = /^[+\d][\d\s-]{8,}$/.test(raw);
    if (looksLikeBareNumber && digits.length >= 10 && digits.length <= 15) return `https://wa.me/${digits}`;
  }

  // A full link is taken as written. This is checked before the handle guesses below so a
  // pasted URL is never re-read as a handle.
  if (/^(https?:)?\/\//i.test(raw)) return raw.startsWith('//') ? `https:${raw}` : raw;
  if (/^(mailto:|tel:)/i.test(raw)) return raw;

  // Any other scheme (javascript:, data:, vbscript:) is never a social page, and pasting
  // one must not survive as a link. Dropping the scheme would turn javascript:alert(1)
  // into a broken https:// URL that still looks plausible, so the whole value is refused
  // and the caller falls back to the platform's own site.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';

  const build = socialHandleUrls[key];
  if (raw.startsWith('@')) {
    // YouTube keeps the @ as part of the path; the other platforms drop it.
    if (build) return build(key === 'youtube' ? raw : raw.slice(1));
  }

  // A handle typed without the @ and with no dot or slash in it ("anishenterprises") is
  // not a domain, and completing it as one produces a dead https://anishenterprises link
  // that looks fine in the admin panel. Anything on this platform can only be a handle.
  if (build && !/[./]/.test(raw)) return build(key === 'youtube' ? `@${raw}` : raw);

  // A bare domain lost its scheme in the copy-paste, so put it back.
  return `https://${raw.replace(/^\/+/, '')}`;
};

/**
 * The address a social icon should actually open. The shop's published handle wins; with
 * nothing published yet the platform's own site is used so the icon is still a working
 * link rather than a dead button.
 */
export const socialLinkFor = (key, value) => normalizeSocialUrl(key, value) || socialPlatformHomeUrls[key] || '';

export const socialIcons = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
};

export const hasContactDetail = (contact) =>
  Boolean([contact?.phone, contact?.phoneAlt, contact?.email, contact?.address, contact?.city, contact?.businessHours].some((value) => String(value || '').trim()));

export const contactLines = (contact = {}) =>
  [contact.address, contact.city, contact.state].filter((part) => String(part || '').trim()).join(', ');

/**
 * Every published phone line, in the order it should be read. The shop answers on both
 * numbers, so neither is dropped or treated as the replacement for the other. Keeping
 * the order here means the contact page and the footer cannot drift apart and start
 * listing them the other way round.
 */
export const contactPhoneLines = (contact = {}) => {
  const seen = new Set();
  return [
    { label: 'Call or WhatsApp', value: contact.phoneAlt },
    { label: 'Call the shop', value: contact.phone },
  ]
    .map((line) => ({ ...line, value: String(line.value || '').trim() }))
    .filter((line) => {
      if (!line.value || seen.has(line.value)) return false;
      seen.add(line.value);
      return true;
    });
};
