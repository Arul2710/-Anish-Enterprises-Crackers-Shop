export const faqStorageKey = 'spark-shine-faq';

export const defaultFaqs = [
  {
    id: 'faq-enquiry-vs-order',
    question: 'Is placing an enquiry the same as placing an order?',
    answer: 'No. An enquiry is a request for pricing, availability and pack details. Our team confirms the final price, quantity and delivery plan with you before anything is reserved or billed.',
  },
  {
    id: 'faq-price',
    question: 'Why do you show NET RAT instead of a fixed price?',
    answer: 'The supplied order sheet has separate RATE and NET RAT columns. We show NET RAT as an indicative catalog value and keep RATE on the product page so nothing is hidden. The confirmed selling price is shared with you in the reply to your enquiry.',
  },
  {
    id: 'faq-availability',
    question: 'Can I confirm stock before I enquire?',
    answer: 'The sheet does not include stock quantities, so availability is always confirmed by our team. Send an enquiry with the listings you are interested in and we will reply with the current position.',
  },
  {
    id: 'faq-payment',
    question: 'How do I pay?',
    answer: 'There is no online payment in this phase. Once your enquiry is confirmed, we agree the amount and the payment method directly with you.',
  },
  {
    id: 'faq-combo-packs',
    question: 'What is a combo pack?',
    answer: 'A combo pack is a suggested grouping of catalog listings we built from the sheet. It is a starting point for your enquiry, not a fixed bundle price. You can remove or add any listing before sending it.',
  },
  {
    id: 'faq-safety',
    question: 'What safety guidance do you follow?',
    answer: 'Fireworks are used only in open outdoor areas, away from structures and dry vegetation, always under adult supervision, and only where local rules permit. Please read the safety page before your celebration.',
  },
];

export const policyPages = {
  privacy: {
    title: 'Privacy',
    eyebrow: 'Your information',
    intro: 'This storefront does not run a server in its current phase. Anything you type stays in your own browser unless you send it to us directly.',
    updated: 'Applicable to this frontend preview',
    sections: [
      { heading: 'What we ask for', body: 'The enquiry form asks for a name, mobile number, email address, delivery address and any message you want to add. Only the fields you fill in are used.' },
      { heading: 'Where it is stored', body: 'In this phase the enquiry list and your saved shortlist are stored in your browser local storage. Clearing your browser data removes them.' },
      { heading: 'No tracking, no accounts', body: 'There are no analytics scripts, advertising pixels, cookies or customer logins connected to this site.' },
      { heading: 'When a backend is connected', body: 'A future backend will replace browser storage with a proper enquiry system. That change will be communicated before any data is collected server-side.' },
      { heading: 'What you can ask for', body: 'Ask us to remove details you have shared with us and we will clear them from our working records.' },
    ],
  },
  terms: {
    title: 'Terms of use',
    eyebrow: 'The basics',
    intro: 'Simple rules for using this storefront and sending an enquiry with us.',
    updated: 'Applicable to this frontend preview',
    sections: [
      { heading: 'This is a catalog preview', body: 'Product names, categories, pack units, RATE and NET RAT values come from the supplied order sheet. Descriptions and images are placeholders until real product media is provided.' },
      { heading: 'Prices are indicative', body: 'NET RAT is shown as an indicative value. It is not a confirmed selling price, and RATE is displayed separately for transparency.' },
      { heading: 'An enquiry is not a commitment', body: 'Sending an enquiry does not reserve stock, create an order or trigger any payment. A sale exists only after we confirm the details with you directly.' },
      { heading: 'Availability', body: 'The source sheet has no stock column, so availability is confirmed separately and can change before confirmation.' },
      { heading: 'Responsible use', body: 'Fireworks are for legal, supervised, outdoor use only. Following local rules and the safety guidance is a condition of purchase.' },
    ],
  },
  safety: {
    title: 'Firework safety',
    eyebrow: 'Please read this first',
    intro: 'Fireworks are fun, but they are explosives. These notes are a reminder to follow local rules and keep everyone safe.',
    updated: 'Always follow your local authority guidance',
    sections: [
      { heading: 'Where to use them', body: 'Open outdoor areas only. Keep well away from houses, vehicles, trees, power lines, dry grass and any combustible material.' },
      { heading: 'Adult supervision', body: 'An adult should be in charge of lighting and handling. Keep children at a safe distance and never let them light a cracker.' },
      { heading: 'Dress and posture', body: 'Loose clothing is dangerous. Tie back long hair, wear closed shoes, stand sideways, bend the knees and never hold a cracker in your hand.' },
      { heading: 'One at a time', body: 'Light one item at a time, then step back. Never relight or hold a dud. Wait until the smoke clears before moving closer.' },
      { heading: 'Respect local rules', body: 'Firecracker bans, timings and noise limits differ by state and city. Follow your local authority guidance, and never use crackers in an aircraft-free zone, near hospitals, schools or courts.' },
      { heading: 'Dispose carefully', body: 'Collect used wrappers and unexploded items after the display. Keep them away from children and dispose of them as your local rules require.' },
    ],
  },
};
