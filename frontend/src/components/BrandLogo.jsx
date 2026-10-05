import { Link } from 'react-router-dom';

/**
 * The shop's own artwork, used for the storefront navbar, footer and admin screens.
 *
 * This is the original logo file that already ships in public/, referenced straight
 * from the site root the same way the hero backgrounds are (/bg/hero.png), so the
 * image resolves on every route without being bundled or renamed.
 *
 * No width/height attributes are declared on the element on purpose. The design asset
 * gets re-exported at new pixel sizes, and a stale pair would be worse than none:
 * every size here sets only the height, so the browser derives the width from the
 * artwork's real intrinsic proportions, and a re-export at a different size simply
 * keeps working instead of needing this file edited to match.
 */
const LOGO_SRC = '/images/logo/logo.png';

/**
 * One lockup, three moving parts: the artwork, the company name, and the strapline.
 *
 * The nav and footer run full width, so every length there is a clamp driven by
 * viewport width and the three scale together: the lockup grows and shrinks as one
 * unit instead of the artwork staying put while the type crawls over it. The navbar
 * sits in a fixed 4.65rem bar that .catalog-toolbar is pinned against, so its clamps
 * cap out at a size that fills that bar without ever growing it.
 *
 * The admin sizes are fixed steps instead. The admin rail is a fixed 288px column, so
 * vw there would measure the browser window rather than the width the lockup actually
 * has, and a tablet-sized window would inflate a logo into a 48px column.
 *
 * Overflow is handled in two independent ways. The type is shrink-0 and nowrap, so the
 * two lines are never compressed and never break onto a third line. The artwork
 * carries min-w-0 instead of shrink-0, so on a narrow screen the logo gives up width
 * rather than pushing its row past the viewport; because only its height is set,
 * object-contain then fits the logo inside the narrower box at its true proportions
 * instead of squashing it.
 */
const SIZES = {
  nav: {
    mark: 'h-[clamp(1.75rem,6vw,3rem)]',
    name: 'text-[clamp(0.7rem,3.1vw,1.2rem)]',
    line: 'text-[clamp(0.44rem,1.9vw,0.625rem)]',
  },
  // The footer is one column below md but becomes a three column grid at md, where the
  // first column is only about 278px wide. So it runs large on its own line, steps down
  // through the narrow md column, and grows again from lg where that column has room.
  footer: {
    mark: 'h-[clamp(2rem,7.5vw,3.5rem)] md:h-11 lg:h-[3.75rem]',
    name: 'text-[clamp(0.8rem,3.6vw,1.35rem)] md:text-[1.05rem] lg:text-[1.4rem]',
    line: 'text-[clamp(0.47rem,2.1vw,0.68rem)] md:text-[0.6rem] lg:text-[0.7rem]',
  },
  // The admin header is a 256px row inside the 288px column, and a 36px button shares it,
  // which leaves 220px. This lockup is sized to fit that rather than to fill the row.
  admin: {
    mark: 'h-10',
    name: 'text-[0.95rem]',
    line: 'text-[0.56rem]',
  },
  panel: {
    mark: 'h-14',
    name: 'text-[1.35rem]',
    line: 'text-[0.7rem]',
  },
};

/**
 * The company name takes the same gold step the rest of the site's gold text already
 * uses: #D4AF37 measures 2.1:1 on the white bar, under the 3:1 that even large text
 * needs. The strapline sits on the brand green #006400 at 7.4:1.
 *
 * On the dark admin panel that inverts. The brand green is unreadable against the dark
 * green there, so the strapline switches to the palette's pale green #e8f3e8, which
 * keeps the green the branding is built on at roughly 14:1. The name goes to #D4AF37,
 * which is 7.4:1 on that panel, so the gold that is too weak on white is the strong one
 * on the dark background.
 */
const TONES = {
  light: { name: 'text-goldInk', line: 'text-royal' },
  dark: { name: 'text-goldBright', line: 'text-royalSoft' },
};

export function BrandLogo({ size = 'nav', tone = 'light', className = '' }) {
  const scale = SIZES[size] ?? SIZES.nav;
  const colors = TONES[tone] ?? TONES.light;

  return (
    <Link
      to="/"
      aria-label="Anish Enterprises, go to homepage"
      className={`inline-flex min-w-0 items-center gap-2 sm:gap-2.5 ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt=""
        className={`w-auto min-w-0 shrink object-contain object-left ${scale.mark}`}
        decoding="async"
      />

      <span className="min-w-0 shrink-0 leading-none">
        <span className={`block whitespace-nowrap font-extrabold tracking-[-0.02em] ${colors.name} ${scale.name}`}>
          Anish Enterprise
        </span>
        <span className={`mt-[0.35em] block whitespace-nowrap font-bold tracking-[0.1em] ${colors.line} ${scale.line}`}>
          WHOLESALE CRACKERS
        </span>
      </span>
    </Link>
  );
}
