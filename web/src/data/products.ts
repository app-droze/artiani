export type ProductType =
  | "postcards"
  | "greeting-cards"
  | "bookmarks"
  | "calendar"
  | "signed-prints";

export type LocalizedText = { en: string; ka: string };

export type Product = {
  id: string;
  slug: string;
  name: LocalizedText;
  type: ProductType;
  summary: LocalizedText;
  description: LocalizedText;
  price: number;
  image: string;
  options: {
    addText?: number;
    signature?: number;
  };
};

export const pick = (text: LocalizedText, lang: string) =>
  text[lang as keyof LocalizedText] ?? text.en;

export const products: Product[] = [
  {
    id: "pc-iris-01",
    slug: "iris-rise-postcards",
    name: {
      en: "Iris Rise Postcards",
      ka: "ირისის განთიადის საფოსტო ბარათები",
    },
    type: "postcards",
    summary: {
      en: "Set of 8 pastel postcards with gold-foil eggs.",
      ka: "8 პასტელური საფოსტო ბარათი ოქროსფერი ფოლგის დეტალებით.",
    },
    description: {
      en: "A spring-forward postcard set with soft gradients and tiny foil accents. Printed on 400gsm uncoated stock for an artisanal feel.",
      ka: "გაზაფხულის თემატიკის ბარათების სეტი რბილი გრადაციებით და მცირე ფოლგის აქცენტებით. დაბეჭდილია 400გმ არალამინირებულ ქაღალდზე, ხელნაკეთი ტექსტურისთვის.",
    },
    price: 24,
    image: "/products/iris-rise.jpg",
    options: {
      signature: 12,
    },
  },
  {
    id: "pc-meadow-02",
    slug: "meadowlight-postcards",
    name: {
      en: "Meadowlight Postcards",
      ka: "მდელოს ნათების საფოსტო ბარათები",
    },
    type: "postcards",
    summary: {
      en: "6-pack of botanical postcards with letterpress texture.",
      ka: "6 ბოტანიკური ბარათი ლეთერპრესის ტექსტურით.",
    },
    description: {
      en: "Wildflower motifs with a tactile letterpress finish. A gentle palette designed for quick notes or keepsakes.",
      ka: "ველური ყვავილების მოტივები შტრიხული ლეთერპრესით. ნაზი პალიტრა მოკლე წერილებისა და სუვენირებისთვის.",
    },
    price: 20,
    image: "/products/meadowlight.jpg",
    options: {
      signature: 10,
    },
  },
  {
    id: "gc-bloom-01",
    slug: "blooming-horizon-greeting-cards",
    name: {
      en: "Blooming Horizon Greeting Cards",
      ka: "აყვავებული ჰორიზონტის სალოცავი ბარათები",
    },
    type: "greeting-cards",
    summary: {
      en: "Set of 6 Easter greeting cards with soft-touch finish.",
      ka: "6 სააღდგომო სალოცავი ბარათი soft-touch დაფარვით.",
    },
    description: {
      en: "Six premium cards with matching envelopes and a soft-touch laminate. Designed for heartfelt spring notes.",
      ka: "ექვსი პრემიუმ ბარათი შესაბამისი კონვერტებით და soft-touch ლამინაციით. შექმნილია გულწრფელი გაზაფხულის გზავნილებისთვის.",
    },
    price: 30,
    image: "/products/blooming-horizon.jpg",
    options: {
      addText: 6,
      signature: 12,
    },
  },
  {
    id: "bm-willow-01",
    slug: "willow-tide-bookmarks",
    name: {
      en: "Willow Tide Bookmarks",
      ka: "ტირიფის ტალღის სანიშნეები",
    },
    type: "bookmarks",
    summary: {
      en: "Pack of 4 illustrated Easter bookmarks.",
      ka: "4 ილუსტრირებული სააღდგომო სანიშნე.",
    },
    description: {
      en: "Slim, matte bookmarks with Easter iconography and a soft linen texture. Ideal for gifting or add-ons.",
      ka: "თხელი, მატე სანიშნეები სააღდგომო სიმბოლოებით და რბილი linen ტექსტურით. იდეალურია საჩუქრის დამატებად.",
    },
    price: 14,
    image: "/products/willow-tide.jpg",
    options: {
      signature: 8,
    },
  },
  {
    id: "cal-spring-01",
    slug: "easter-studio-calendar",
    name: {
      en: "Easter Studio Calendar",
      ka: "სტუდიის სააღდგომო კალენდარი",
    },
    type: "calendar",
    summary: {
      en: "Desktop calendar with 12 spring-forward vignettes.",
      ka: "სამაგიდო კალენდარი 12 გაზაფხულის ესკიზით.",
    },
    description: {
      en: "A compact desk calendar featuring soft Easter vignettes and seasonal affirmations. Includes a brass binder clip.",
      ka: "კომპაქტური სამაგიდო კალენდარი რბილი სააღდგომო სცენებით და სეზონური მესიჯებით. მოყვება ბრასის კლიპი.",
    },
    price: 36,
    image: "/products/easter-calendar.jpg",
    options: {
      addText: 6,
    },
  },
  {
    id: "sp-lumen-01",
    slug: "lumen-garden-signed-print",
    name: {
      en: "Lumen Garden Signed Print",
      ka: "ლიუმენის ბაღის ხელმოწერილი პრინტი",
    },
    type: "signed-prints",
    summary: {
      en: "A3 archival art print with studio signature.",
      ka: "A3 არქივული პრინტი სტუდიის ხელმოწერით.",
    },
    description: {
      en: "Limited A3 art print with layered inks and a soft cotton texture. Each piece can be signed and personalized for the Easter launch.",
      ka: "შეზღუდული A3 არტ პრინტი მრავალშრიანი მელნებით და რბილი ბამბის ტექსტურით. თითოეული ნამუშევარი შეიძლება იყოს ხელმოწერილი და პერსონალიზებული სააღდგომო გამოსვლისთვის.",
    },
    price: 120,
    image: "/products/lumen-garden.jpg",
    options: {
      addText: 10,
      signature: 18,
    },
  },
];

export const productTypes: { label: string; value: ProductType }[] = [
  { label: "Postcards", value: "postcards" },
  { label: "Greeting Cards", value: "greeting-cards" },
  { label: "Bookmarks", value: "bookmarks" },
  { label: "Calendar", value: "calendar" },
  { label: "Signed Prints", value: "signed-prints" },
];
