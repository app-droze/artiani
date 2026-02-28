export type ProductKind =
  | "cards"
  | "bookmarks"
  | "calendars"
  | "paintings"
  | "prints";

export type LocalizedText = { en: string; ka: string };

export type CardMedia = {
  postcardImages: string[];
  greetingImages: string[];
  signatureOverlay?: string;
};

export type BookmarksMedia = {
  images: string[];
};

export type CalendarsMedia = {
  images: string[];
};

export type PaintingsMedia = {
  images: string[];
  auction: {
    minBidGEL: number;
    bidCount: number;
    endsAtISO?: string;
    depositGEL?: number;
  };
};

const demoImages = ["/brand/sheep-seal.png", "/brand/sheep-seal.png", "/brand/sheep-seal.png"];
const demoImages2 = ["/brand/sheep-seal.png", "/brand/sheep-seal.png"];

export type Product = {
  id: string;
  slug: string;
  name: LocalizedText;
  kind: ProductKind;
  summary: LocalizedText;
  description: LocalizedText;
  price: number;
  image: string;
  options: {
    signature?: number;
  };
  cards?: CardMedia;
  bookmarks?: BookmarksMedia;
  calendars?: CalendarsMedia;
  paintings?: PaintingsMedia;
  prints?: {
    images: string[];
  };
};

export const pick = (text: LocalizedText, lang: string) =>
  text[lang as keyof LocalizedText] ?? text.en;

export const products: Product[] = [
  {
    id: "pc-memories-01",
    slug: "memories-cards",
    name: {
      en: "Memories — 3 cards",
      ka: "მოგონებები — 3 ბარათი",
    },
    kind: "cards",
    summary: {
      en: "Works from different collections — a set of 3 cards.",
      ka: "ნამუშევრები სხვადასხვა კოლექციებიდან — 3 ბარათის ნაკრები.",
    },
    description: {
      en: "Works from different collections — a set of 3 cards curated by Levan Margiani’s studio. Perfect as a gift or to start a small personal collection.",
      ka: "ნამუშევრები სხვადასხვა კოლექციებიდან — 3 ბარათის ნაკრები, შერჩეული ლევან მარგიანის სტუდიის მიერ. იდეალურია საჩუქრად ან მცირე კოლექციის დასაწყებად.",
    },
    price: 35,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_ocf9kiocf9kiocf9.png",
    options: {
      signature: 15,
    },
    cards: {
      postcardImages: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_ocf9kiocf9kiocf9.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/grok-image-d34b6a87-a240-4829-a065-2f66d6c592bc%20(1).png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/grok-image-d34b6a87-a240-4829-a065-2f66d6c592bc.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Screenshot%202026-02-25%20at%209.38.17%20PM.png",
      ],
      greetingImages: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_uzxjgquzxjgquzxj.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2025,%202026,%2009_53_11%20PM.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/ChatGPT%20Image%20Feb%2025,%202026,%2010_02_47%20PM.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Screenshot%202026-02-25%20at%209.45.44%20PM.png",
      ],
      signatureOverlay: "/brand/sheep-seal.png",
    },
  },
  {
    id: "bm-willow-01",
    slug: "willow-tide-bookmarks",
    name: {
      en: "Willow Tide Bookmarks",
      ka: "ტირიფის ტალღის სანიშნეები",
    },
    kind: "bookmarks",
    summary: {
      en: "Pack of 4 illustrated Easter bookmarks.",
      ka: "4 ილუსტრირებული სააღდგომო სანიშნე.",
    },
    description: {
      en: "Slim, matte bookmarks with Easter iconography and a soft linen texture. Ideal for gifting or add-ons.",
      ka: "თხელი, მატე სანიშნეები სააღდგომო სიმბოლოებით და რბილი linen ტექსტურით. იდეალურია საჩუქრის დამატებად.",
    },
    price: 14,
    image: "/brand/sheep-seal.png",
    options: {},
    bookmarks: {
      images: demoImages,
    },
  },
  {
    id: "bm-sienna-02",
    slug: "sienna-arc-bookmarks",
    name: {
      en: "Sienna Arc Bookmarks",
      ka: "სიენას თაღის სანიშნეები",
    },
    kind: "bookmarks",
    summary: {
      en: "Set of 5 linen-finish bookmarks with soft gilding.",
      ka: "5 სანიშნე linen ტექსტურით და რბილი ოქროს დეტალებით.",
    },
    description: {
      en: "A warm palette of sienna tones with a delicate gilded edge. Designed for collector editions and quiet gifting.",
      ka: "თბილი სიენას პალიტრა ნაზი ოქროს კიდით. შექმნილია კოლექციური გამოცემებისა და მშვიდი საჩუქრებისთვის.",
    },
    price: 16,
    image: "/brand/sheep-seal.png",
    options: {},
    bookmarks: {
      images: demoImages2,
    },
  },
  {
    id: "bm-lumen-03",
    slug: "lumen-thread-bookmarks",
    name: {
      en: "Lumen Thread Bookmarks",
      ka: "ლიუმენის ძაფის სანიშნეები",
    },
    kind: "bookmarks",
    summary: {
      en: "Pack of 4 slender bookmarks with stitched detail.",
      ka: "4 თხელი სანიშნე ნაკერის დეტალით.",
    },
    description: {
      en: "Minimalist bookmarks with a stitched thread detail and matte finish. Ideal as an add-on to prints.",
      ka: "მინიმალისტური სანიშნეები ნაკერის დეტალით და მატე ზედაპირით. იდეალურია პრინტებთან ერთად.",
    },
    price: 12,
    image: "/brand/sheep-seal.png",
    options: {},
    bookmarks: {
      images: demoImages2,
    },
  },
  {
    id: "cal-spring-01",
    slug: "easter-studio-calendar",
    name: {
      en: "Easter Studio Calendar",
      ka: "სტუდიის სააღდგომო კალენდარი",
    },
    kind: "calendars",
    summary: {
      en: "Desktop calendar with 12 spring-forward vignettes.",
      ka: "სამაგიდო კალენდარი 12 გაზაფხულის ესკიზით.",
    },
    description: {
      en: "A compact desk calendar featuring soft Easter vignettes and seasonal affirmations. Includes a brass binder clip.",
      ka: "კომპაქტური სამაგიდო კალენდარი რბილი სააღდგომო სცენებით და სეზონური მესიჯებით. მოყვება ბრასის კლიპი.",
    },
    price: 36,
    image: "/brand/sheep-seal.png",
    options: {},
    calendars: {
      images: demoImages,
    },
  },
  {
    id: "cal-aurora-02",
    slug: "aurora-desk-calendar",
    name: {
      en: "Aurora Desk Calendar",
      ka: "ავრორას სამაგიდო კალენდარი",
    },
    kind: "calendars",
    summary: {
      en: "Compact desk calendar with pastel vignettes.",
      ka: "კომპაქტური სამაგიდო კალენდარი პასტელური სცენებით.",
    },
    description: {
      en: "A 12-month desk calendar featuring soft aurora gradients and seasonal notes. Includes a brass clip.",
      ka: "12-თვიანი კალენდარი რბილი ავრორას გრადაციებით და სეზონური ჩანაწერებით. მოყვება ბრასის კლიპი.",
    },
    price: 34,
    image: "/brand/sheep-seal.png",
    options: {},
    calendars: {
      images: demoImages2,
    },
  },
  {
    id: "cal-linen-03",
    slug: "linen-studio-calendar",
    name: {
      en: "Linen Studio Calendar",
      ka: "ლინენის სტუდიის კალენდარი",
    },
    kind: "calendars",
    summary: {
      en: "Minimal calendar with linen texture covers.",
      ka: "მინიმალისტური კალენდარი linen ტექსტურის ყდით.",
    },
    description: {
      en: "A pared-back calendar with linen texture and tonal typography. Designed to sit quietly on the desk.",
      ka: "თავშეკავებული კალენდარი linen ტექსტურით და ტონალური ტიპოგრაფიით. შექმნილია მშვიდი სამუშაო მაგიდისთვის.",
    },
    price: 32,
    image: "/brand/sheep-seal.png",
    options: {},
    calendars: {
      images: demoImages2,
    },
  },
  {
    id: "pt-shoba2-01",
    slug: "shoba2",
    name: {
      en: "Christmas",
      ka: "შობა",
    },
    kind: "paintings",
    summary: {
      en: "Levcas, gold leaf and tempera on paper (25×20 cm).",
      ka: "ლევკასი, ოქროს ფურცელი და ტემპერა ქაღალდზე (25x20სმ).",
    },
    description: {
      en: "Levcas. Gold leaf. Tempera. Paper. 25×20 cm.",
      ka: "ლევკასი. ოქროს ფურცელი. ტემპერა. ქაღალდი. 25x20სმ",
    },
    price: 0,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%202%201.jpg",
    options: {},
    paintings: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%202%201.jpg",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%201%201.jpg",
      ],
      auction: {
        minBidGEL: 250,
        bidCount: 0,
        endsAtISO: "2026-03-20T23:59:00+04:00",
      },
    },
  },
  {
    id: "pt-shoba-02",
    slug: "shoba",
    name: {
      en: "Christmas",
      ka: "შობა",
    },
    kind: "paintings",
    summary: {
      en: "Levcas, gold leaf and tempera on paper (25×20 cm).",
      ka: "ლევკასი, ოქროს ფურცელი და ტემპერა ქაღალდზე (25x20სმ).",
    },
    description: {
      en: "Levcas. Gold leaf. Tempera. Paper. 25×20 cm.",
      ka: "ლევკასი. ოქროს ფურცელი. ტემპერა. ქაღალდი. 25x20სმ",
    },
    price: 0,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%201%200.jpg",
    options: {},
    paintings: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%201%200.jpg",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/shoba%201%201.jpg",
      ],
      auction: {
        minBidGEL: 250,
        bidCount: 0,
        endsAtISO: "2026-03-20T23:59:00+04:00",
      },
    },
  },
  {
    id: "pt-angelozi-03",
    slug: "angelozi",
    name: {
      en: "Angel",
      ka: "ანგელოზი",
    },
    kind: "paintings",
    summary: {
      en: "Levcas, gold leaf and tempera on paper (15×20 cm).",
      ka: "ლევკასი, ოქროს ფურცელი და ტემპერა ქაღალდზე (15x20სმ).",
    },
    description: {
      en: "Levcas. Gold leaf. Tempera. Paper. 15×20 cm.",
      ka: "ლევკასი. ოქროს ფურცელი. ტემპერა. ქაღალდი. 15x20სმ",
    },
    price: 0,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/angelozi.jpg",
    options: {},
    paintings: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/angelozi.jpg",
      ],
      auction: {
        minBidGEL: 150,
        bidCount: 0,
        endsAtISO: "2026-03-20T23:59:00+04:00",
      },
    },
  },
  {
    id: "pr-lumen-01",
    slug: "lumen-garden-print-edition",
    name: {
      en: "Lumen Garden Print Edition",
      ka: "ლიუმენის ბაღის პრინტის გამოცემა",
    },
    kind: "prints",
    summary: {
      en: "Limited A3 print with soft cotton texture.",
      ka: "შეზღუდული A3 პრინტი რბილი ბამბის ტექსტურით.",
    },
    description: {
      en: "A limited edition A3 art print with layered inks and archival paper. Offered as an open display piece for the catalogue.",
      ka: "შეზღუდული გამოცემის A3 არტ პრინტი მრავალშრიანი მელნებით და არქივული ქაღალდით. წარმოდგენილია კატალოგში როგორც საჩვენებელი ნამუშევარი.",
    },
    price: 140,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 18,
    },
    prints: {
      images: demoImages,
    },
  },
  {
    id: "pr-aurora-02",
    slug: "aurora-slate-print",
    name: {
      en: "Aurora Slate Print",
      ka: "ავრორას სლეიტის პრინტი",
    },
    kind: "prints",
    summary: {
      en: "Archival print with dusky gradients.",
      ka: "არქივული პრინტი ღამური გრადაციებით.",
    },
    description: {
      en: "A quiet A3 print with cool gradients and matte paper, meant for calm interiors.",
      ka: "მშვიდი A3 პრინტი ცივი გრადაციებით და მატე ქაღალდით, მშვიდი ინტერიერებისთვის.",
    },
    price: 110,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 12,
    },
    prints: {
      images: demoImages2,
    },
  },
  {
    id: "pr-meadow-03",
    slug: "meadow-silk-print",
    name: {
      en: "Meadow Silk Print",
      ka: "მდელოს აბრეშუმის პრინტი",
    },
    kind: "prints",
    summary: {
      en: "Soft green print on textured stock.",
      ka: "ნაზი მწვანე პრინტი ტექსტურიან ქაღალდზე.",
    },
    description: {
      en: "A limited A3 print on textured stock with soft green tones and fine linework.",
      ka: "შეზღუდული A3 პრინტი ტექსტურიან ქაღალდზე, ნაზი მწვანე ტონებით და თხელი ხაზებით.",
    },
    price: 125,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 12,
    },
    prints: {
      images: demoImages2,
    },
  },
];

export const productTypes: { label: string; value: ProductKind }[] = [
  { label: "Paintings", value: "paintings" },
  { label: "Prints", value: "prints" },
  { label: "Calendars", value: "calendars" },
  { label: "Bookmarks", value: "bookmarks" },
  { label: "Cards", value: "cards" },
];
