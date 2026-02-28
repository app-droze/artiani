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

export type PrintVariant = {
  id: string;
  label: LocalizedText;
  price: number;
  dimensions?: string;
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
    variants?: PrintVariant[];
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
    id: "bm-collection-01",
    slug: "bookmarks-collection-3",
    name: {
      en: "Bookmark Collection — 3 pieces",
      ka: "სანიშნეების კოლექცია — 3 ცალი",
    },
    kind: "bookmarks",
    summary: {
      en: "Three handcrafted bookmarks in one curated set.",
      ka: "სამი ხელნაკეთი სანიშნე ერთ შერჩეულ ნაკრებად.",
    },
    description: {
      en: "A curated set of three handcrafted bookmarks—metal, gold-toned, and wooden—made for daily reading and gifting.",
      ka: "სამი ხელნაკეთი სანიშნის შერჩეული ნაკრები — მეტალი, ოქროსფერი და ხის დიზაინი — ყოველდღიური კითხვისთვის და საჩუქრად.",
    },
    price: 25,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_984uhx984uhx984u.png",
    options: {},
    bookmarks: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_984uhx984uhx984u.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_c1zmt6c1zmt6c1zm.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_65jyky65jyky65jy%20(1).png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_65jyky65jyky65jy.png",
      ],
    },
  },
  {
    id: "bm-silver-02",
    slug: "bookmark-silver-turquoise",
    name: {
      en: "Silver & Turquoise Bookmark",
      ka: "ვერცხლისფერი და ტურქიზის სანიშნე",
    },
    kind: "bookmarks",
    summary: {
      en: "Embossed metal texture with turquoise accents.",
      ka: "რელიეფური მეტალის ტექსტურა ტურქიზის დეტალებით.",
    },
    description: {
      en: "A handcrafted bookmark with embossed metal texture and turquoise accents. A collectible piece for book lovers.",
      ka: "ხელნაკეთი სანიშნე რელიეფური მეტალის ტექსტურით და ტურქიზის დეტალებით. მცირე საკოლექციო ნივთი წიგნის მოყვარულებისთვის.",
    },
    price: 10,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_65jyky65jyky65jy.png",
    options: {},
    bookmarks: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_65jyky65jyky65jy.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/bookmarks_left.png",
      ],
    },
  },
  {
    id: "bm-golden-03",
    slug: "bookmark-golden-couple",
    name: {
      en: "Golden Couple Bookmark",
      ka: "ოქროსფერი წყვილის სანიშნე",
    },
    kind: "bookmarks",
    summary: {
      en: "Gold-toned bookmark with a miniature-style scene.",
      ka: "ოქროსფერი სანიშნე მინიატურული სცენით.",
    },
    description: {
      en: "A gold-toned bookmark featuring an original miniature-style scene. Gift-ready and elegant on any bookshelf.",
      ka: "ოქროსფერი სანიშნე ორიგინალური მინიატურული სცენით. ელეგანტური და საჩუქრადაც იდეალური.",
    },
    price: 10,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/bookmarks_right.png",
    options: {},
    bookmarks: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/bookmarks_right.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_65jyky65jyky65jy%20(1).png",
      ],
    },
  },
  {
    id: "bm-wooden-04",
    slug: "bookmark-wooden-sheep",
    name: {
      en: "Wooden Sheep Bookmark",
      ka: "ხის „ცხვრის“ სანიშნე",
    },
    kind: "bookmarks",
    summary: {
      en: "Wooden bookmark with the Artiani sheep seal.",
      ka: "ხის სანიშნე Artiani-ს „ცხვრის“ ბეჭდით.",
    },
    description: {
      en: "A warm wooden bookmark finished with the Artiani sheep seal—simple, tactile, and made for everyday reading.",
      ka: "თბილი ხის სანიშნე Artiani-ს „ცხვრის“ ბეჭდით — მარტივი, სასიამოვნო ტექსტურით და ყოველდღიური კითხვისთვის.",
    },
    price: 10,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_c1zmt6c1zmt6c1zm.png",
    options: {},
    bookmarks: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_c1zmt6c1zmt6c1zm.png",
      ],
    },
  },
  {
    id: "cal-set-01",
    slug: "calendar-set-2026",
    name: {
      en: "2026 Calendar Set (Wall + Desk)",
      ka: "2026 წლის კალენდრების ნაკრები (კედლის + სამაგიდო)",
    },
    kind: "calendars",
    summary: {
      en: "Two formats in one set—perfect for home or studio.",
      ka: "ორი ფორმატი ერთ ნაკრებად — სახლში და სამუშაო სივრცისთვის.",
    },
    description: {
      en: "A curated calendar set featuring Levan Margiani’s icon-inspired artworks: a wall year overview and a desk calendar for everyday use. A gift-ready set for the new year.",
      ka: "შერჩეული ნაკრები ლევან მარგიანის ნამუშევრებით: კედლის „წლის მიმოხილვა“ და სამაგიდო კალენდარი ყოველდღიური გამოყენებისთვის. იდეალურია ახალ წელს საჩუქრად.",
    },
    price: 50,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20both.png",
    options: {},
    calendars: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20both.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20full.png",
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20standing.png",
      ],
    },
  },
  {
    id: "cal-wall-02",
    slug: "calendar-wall-2026",
    name: {
      en: "2026 Wall Calendar (Year Overview)",
      ka: "2026 წლის კედლის კალენდარი (წლის მიმოხილვა)",
    },
    kind: "calendars",
    summary: {
      en: "A one-page year overview with an ornamental frame.",
      ka: "ერთგვერდიანი წლის მიმოხილვა ორნამენტულ ჩარჩოში.",
    },
    description: {
      en: "A one-page wall calendar designed as a framed artwork—clear year overview with an ornamental border and the artist’s signature style.",
      ka: "ერთგვერდიანი კედლის კალენდარი — როგორც ჩარჩოში ჩასასმელი ნამუშევარი: წლის მკაფიო მიმოხილვა ორნამენტული ჩარჩოთი და მხატვრის სტილით.",
    },
    price: 25,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20full.png",
    options: {},
    calendars: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20full.png",
      ],
    },
  },
  {
    id: "cal-desk-03",
    slug: "calendar-desk-2026",
    name: {
      en: "2026 Desk Calendar (Monthly Flip)",
      ka: "2026 წლის სამაგიდო კალენდარი (თვეების მიხედვით)",
    },
    kind: "calendars",
    summary: {
      en: "Month-by-month calendar for your desk.",
      ka: "თვეების მიხედვით — სამუშაო მაგიდისთვის.",
    },
    description: {
      en: "A desk calendar made for daily planning—month-by-month pages with Levan Margiani’s artwork. Perfect for a workspace or home desk.",
      ka: "სამაგიდო კალენდარი ყოველდღიური დაგეგმვისთვის — თვეების მიხედვით გვერდები ლევან მარგიანის ნამუშევრებით. იდეალურია სამუშაო სივრცისთვის.",
    },
    price: 35,
    image:
      "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20standing.png",
    options: {},
    calendars: {
      images: [
        "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/calendar%20standing.png",
      ],
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
      variants: [
        {
          id: "a3",
          label: { en: "A3", ka: "A3" },
          price: 140,
          dimensions: "29.7x42 cm",
        },
        {
          id: "a4",
          label: { en: "A4", ka: "A4" },
          price: 110,
          dimensions: "21x29.7 cm",
        },
        {
          id: "a2",
          label: { en: "A2", ka: "A2" },
          price: 190,
          dimensions: "42x59.4 cm",
        },
      ],
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
      variants: [
        {
          id: "a3",
          label: { en: "A3", ka: "A3" },
          price: 110,
          dimensions: "29.7x42 cm",
        },
        {
          id: "a4",
          label: { en: "A4", ka: "A4" },
          price: 85,
          dimensions: "21x29.7 cm",
        },
        {
          id: "a2",
          label: { en: "A2", ka: "A2" },
          price: 155,
          dimensions: "42x59.4 cm",
        },
      ],
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
      variants: [
        {
          id: "a3",
          label: { en: "A3", ka: "A3" },
          price: 125,
          dimensions: "29.7x42 cm",
        },
        {
          id: "a4",
          label: { en: "A4", ka: "A4" },
          price: 95,
          dimensions: "21x29.7 cm",
        },
        {
          id: "a2",
          label: { en: "A2", ka: "A2" },
          price: 170,
          dimensions: "42x59.4 cm",
        },
      ],
    },
  },
];

export const productTypes: { label: string; value: ProductKind }[] = [
  { label: "Paintings", value: "paintings" },
  { label: "Bookmarks", value: "bookmarks" },
  { label: "Calendars", value: "calendars" },
  { label: "Cards", value: "cards" },
  { label: "Prints", value: "prints" },
];
