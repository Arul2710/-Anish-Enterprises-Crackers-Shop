import { socialLinkFor } from '../data/siteContent';
import { useContent } from '../hooks/useContent';

/**
 * The floating WhatsApp chat button. It is a single fixed control rather than one
 * per page so it cannot drift between layouts, and it renders above the footer
 * instead of inside it so it stays put while the page scrolls.
 *
 * `bottom` and `right` are set on the wrapper rather than the button so the inset
 * survives the safe area on phones that have a home indicator, and `env(safe-area-inset-*)`
 * keeps it clear of that strip on notched devices.
 */
export function WhatsAppButton() {
  const { siteContent } = useContent();
  // socialLinkFor completes a bare number pasted into the admin field into a
  // wa.me link, and falls back to nothing rather than guessing a number.
  const href = socialLinkFor('whatsapp', siteContent?.social?.whatsapp);
  if (!href) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pr-[calc(1rem+env(safe-area-inset-right))] sm:p-5 sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pr-[calc(1.25rem+env(safe-area-inset-right))]">
      <a
        className="group pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform duration-200 ease-out hover:scale-105 hover:shadow-xl hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:h-16 sm:w-16"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp (opens in a new tab)"
        title="Chat with us on WhatsApp"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-current sm:h-9 sm:w-9">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.987 2.898 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.465 3.488" />
        </svg>
        <span className="sr-only">Chat with us on WhatsApp</span>
      </a>
    </div>
  );
}
