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
    id: "pc-iris-01",
    slug: "iris-rise-postcards",
    name: {
      en: "Iris Rise Cards",
      ka: "ირისის განთიადის ბარათები",
    },
    kind: "cards",
    summary: {
      en: "Set of 8 pastel cards with gold-foil eggs.",
      ka: "8 პასტელური ბარათი ოქროსფერი ფოლგის დეტალებით.",
    },
    description: {
      en: "A spring-forward card set with soft gradients and tiny foil accents. Printed on 400gsm uncoated stock for an artisanal feel.",
      ka: "გაზაფხულის თემატიკის ბარათების სეტი რბილი გრადაციებით და მცირე ფოლგის აქცენტებით. დაბეჭდილია 400გმ არალამინირებულ ქაღალდზე, ხელნაკეთი ტექსტურისთვის.",
    },
    price: 24,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 12,
    },
    cards: {
      postcardImages: demoImages,
      greetingImages: demoImages2,
      signatureOverlay: "/brand/sheep-seal.png",
    },
  },
  {
    id: "pc-meadow-02",
    slug: "meadowlight-postcards",
    name: {
      en: "Meadowlight Cards",
      ka: "მდელოს ნათების ბარათები",
    },
    kind: "cards",
    summary: {
      en: "6-pack of botanical cards with letterpress texture.",
      ka: "6 ბოტანიკური ბარათი ლეთერპრესის ტექსტურით.",
    },
    description: {
      en: "Wildflower motifs with a tactile letterpress finish. A gentle palette designed for quick notes or keepsakes.",
      ka: "ველური ყვავილების მოტივები შტრიხული ლეთერპრესით. ნაზი პალიტრა მოკლე წერილებისა და სუვენირებისთვის.",
    },
    price: 20,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 10,
    },
    cards: {
      postcardImages: demoImages2,
      greetingImages: demoImages,
      signatureOverlay: "/brand/sheep-seal.png",
    },
  },
  {
    id: "gc-bloom-01",
    slug: "blooming-horizon-greeting-cards",
    name: {
      en: "Blooming Horizon Cards",
      ka: "აყვავებული ჰორიზონტის ბარათები",
    },
    kind: "cards",
    summary: {
      en: "Set of 6 Easter cards with soft-touch finish.",
      ka: "6 სააღდგომო ბარათი soft-touch დაფარვით.",
    },
    description: {
      en: "Six premium cards with matching envelopes and a soft-touch laminate. Designed for heartfelt spring notes.",
      ka: "ექვსი პრემიუმ ბარათი შესაბამისი კონვერტებით და soft-touch ლამინაციით. შექმნილია გულწრფელი გაზაფხულის გზავნილებისთვის.",
    },
    price: 30,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 12,
    },
    cards: {
      postcardImages: demoImages,
      greetingImages: demoImages2,
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
    id: "sp-lumen-01",
    slug: "lumen-garden-signed-print",
    name: {
      en: "Lumen Garden Print",
      ka: "ლიუმენის ბაღის პრინტი",
    },
    kind: "paintings",
    summary: {
      en: "A3 archival art print with studio signature.",
      ka: "A3 არქივული პრინტი სტუდიის ხელმოწერით.",
    },
    description: {
      en: "Limited A3 art print with layered inks and a soft cotton texture. Each piece can be signed and personalized for the Easter launch.",
      ka: "შეზღუდული A3 არტ პრინტი მრავალშრიანი მელნებით და რბილი ბამბის ტექსტურით. თითოეული ნამუშევარი შეიძლება იყოს ხელმოწერილი და პერსონალიზებული სააღდგომო გამოსვლისთვის.",
    },
    price: 120,
    image: "/brand/sheep-seal.png",
    options: {
      signature: 18,
    },
    paintings: {
      images: demoImages,
      auction: {
        minBidGEL: 2200,
        bidCount: 6,
        endsAtISO: "2026-04-20T18:00:00+04:00",
        depositGEL: 150,
      },
    },
  },
  {
    id: "pt-veil-02",
    slug: "veil-of-olive-painting",
    name: {
      en: "Veil of Olive",
      ka: "ზეთისხილის საბურველი",
    },
    kind: "paintings",
    summary: {
      en: "Tempera miniature with silver frame.",
      ka: "ტემპერით შესრულებული მინიატურა ვერცხლის ჩარჩოთი.",
    },
    description: {
      en: "A miniature tempera work with layered gold leaf and an artist-made silver frame.",
      ka: "ტემპერით შესრულებული მინიატურა ოქროს ფოთლის შრეებით და ავტორის მიერ დამზადებული ვერცხლის ჩარჩოთი.",
    },
    price: 0,
    image: "/brand/sheep-seal.png",
    options: {},
    paintings: {
      images: demoImages2,
      auction: {
        minBidGEL: 2800,
        bidCount: 3,
        endsAtISO: "2026-04-28T18:00:00+04:00",
        depositGEL: 200,
      },
    },
  },
  {
    id: "pt-gold-03",
    slug: "gold-horizon-painting",
    name: {
      en: "Gold Horizon",
      ka: "ოქროს ჰორიზონტი",
    },
    kind: "paintings",
    summary: {
      en: "Miniature icon study in tempered tones.",
      ka: "მინიატურული ხატწერის ეტიუდი თბილ ტონებში.",
    },
    description: {
      en: "A quiet icon study rendered in tempera on levkas, framed in tinted copper made by the artist.",
      ka: "მშვიდი ხატწერის ეტიუდი ტემპერით ლევკასზე, ტონირებული სპილენძის ჩარჩოთი რომელიც ავტორმა დაამზადა.",
    },
    price: 0,
    image: "/brand/sheep-seal.png",
    options: {},
    paintings: {
      images: demoImages2,
      auction: {
        minBidGEL: 3100,
        bidCount: 2,
        endsAtISO: "2026-05-05T18:00:00+04:00",
        depositGEL: 250,
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
