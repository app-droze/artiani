"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { useCart } from "@/src/components/CartProvider";
import { ProductGallery } from "@/src/components/product/ProductGallery";
import { ProductInfoSections } from "@/src/components/product/ProductInfoSections";
import { ProductPurchasePanel } from "@/src/components/product/ProductPurchasePanel";
import type { Dictionary } from "@/src/i18n/getDictionary";
import { t } from "@/src/i18n/getDictionary";
import type { Locale } from "@/src/i18n/locales";

type ProductDetailsProps = {
  product: Product;
  lang: Locale;
  dict: Dictionary;
  prevProduct: Product | null;
  nextProduct: Product | null;
};

type CreateBidResponse = {
  code?: string;
  emailSent?: boolean;
};

type BidFormState = {
  name: string;
  email: string;
  phoneCountry: string;
  phoneLocal: string;
  amount: string;
  note: string;
};

export const ProductDetails = ({
  product,
  lang,
  dict,
  prevProduct,
  nextProduct,
}: ProductDetailsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { addItem, items } = useCart();

  const [signature, setSignature] = useState(false);
  const [selectedFront, setSelectedFront] = useState(0);
  const [selectedBack, setSelectedBack] = useState<"postcard" | "greeting">(
    "postcard",
  );
  const [selectedPrintVariantId, setSelectedPrintVariantId] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [isBidSubmitting, setIsBidSubmitting] = useState(false);
  const [bidSubmitError, setBidSubmitError] = useState<string | null>(null);
  const [bidForm, setBidForm] = useState<BidFormState>({
    name: "",
    email: "",
    phoneCountry: "+995",
    phoneLocal: "",
    amount: "",
    note: "",
  });

  const { options } = product;
  const hasSignature = typeof options.signature === "number";
  const typeLabel = t(dict, `productTypes.${product.kind}`);
  const auction = product.paintings?.auction;
  const cardsMedia = product.cards;
  const hasSignatureOverlay = Boolean(cardsMedia?.signatureOverlay);
  const printVariants = useMemo(
    () => (product.kind === "prints" ? product.prints?.variants ?? [] : []),
    [product.kind, product.prints?.variants],
  );

  useEffect(() => {
    if (product.kind === "prints") {
      setSelectedPrintVariantId(printVariants[0]?.id ?? null);
      return;
    }
    setSelectedPrintVariantId(null);
  }, [product.id, product.kind, printVariants]);

  const selectedPrintVariant = useMemo(() => {
    if (product.kind !== "prints" || printVariants.length === 0) return null;
    return (
      printVariants.find((variant) => variant.id === selectedPrintVariantId) ??
      printVariants[0]
    );
  }, [product.kind, printVariants, selectedPrintVariantId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const price = useMemo(() => {
    let total = product.price;
    if (product.kind === "prints" && selectedPrintVariant) {
      total = selectedPrintVariant.price;
    }
    if (product.kind === "cards" && selectedBack === "greeting") {
      total += 10;
    }
    if (signature && hasSignature) total += options.signature ?? 0;
    return total;
  }, [
    signature,
    product.kind,
    product.price,
    selectedBack,
    selectedPrintVariant,
    hasSignature,
    options,
  ]);

  const cartQty = useMemo(
    () =>
      items
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.qty, 0),
    [items, product.id],
  );

  const galleryImages = useMemo(() => {
    if (product.kind === "cards") {
      const postcardImages = product.cards?.postcardImages ?? [];
      const greetingImages = product.cards?.greetingImages ?? [];
      const images = selectedBack === "postcard" ? postcardImages : greetingImages;
      return images.length > 0 ? images : [product.image].filter(Boolean);
    }
    if (product.kind === "bookmarks") {
      return product.bookmarks?.images ?? [product.image].filter(Boolean);
    }
    if (product.kind === "calendars") {
      return product.calendars?.images ?? [product.image].filter(Boolean);
    }
    if (product.kind === "prints") {
      return product.prints?.images ?? [product.image].filter(Boolean);
    }
    if (product.kind === "paintings") {
      return product.paintings?.images ?? [product.image].filter(Boolean);
    }
    return [product.image].filter(Boolean);
  }, [product, selectedBack]);

  useEffect(() => {
    if (selectedFront >= galleryImages.length) {
      setSelectedFront(0);
    }
  }, [galleryImages.length, selectedFront]);

  const cycleIndex = (direction: "next" | "prev") => {
    if (galleryImages.length === 0) return;
    setSelectedFront((current) => {
      if (direction === "next") {
        return (current + 1) % galleryImages.length;
      }
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  };

  const formatAuctionDate = (iso?: string) => {
    if (!iso) return null;
    try {
      const formatter = new Intl.DateTimeFormat(lang === "ka" ? "ka-GE" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tbilisi",
      });
      return formatter.format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleBidSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auction || isBidSubmitting) return;

    setBidSubmitError(null);
    setIsBidSubmitting(true);

    try {
      const response = await fetch("/api/bids/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lang,
          bid: {
            productSlug: product.slug,
            fullName: bidForm.name,
            email: bidForm.email,
            phone: `${bidForm.phoneCountry} ${bidForm.phoneLocal}`.trim(),
            amount: Number(bidForm.amount),
            note: bidForm.note,
          },
        }),
      });

      const payload = (await response.json()) as CreateBidResponse;
      if (!response.ok || !payload.code) {
        throw new Error("create-bid-failed");
      }

      const emailSentParam = payload.emailSent === false ? "0" : "1";
      const amountParam = Number(bidForm.amount);
      router.push(
        `/${lang}/bid?code=${encodeURIComponent(payload.code)}&emailSent=${emailSentParam}&slug=${encodeURIComponent(product.slug)}&amount=${encodeURIComponent(String(amountParam))}`,
      );
    } catch {
      setBidSubmitError(t(dict, "auction.errorGeneric"));
    } finally {
      setIsBidSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    addItem(
      product,
      {
        signature: hasSignature ? signature : false,
        cardBack: product.kind === "cards" ? selectedBack : undefined,
        printVariantId: product.kind === "prints" ? selectedPrintVariant?.id : undefined,
        printVariantLabel:
          product.kind === "prints" && selectedPrintVariant
            ? pick(selectedPrintVariant.label, lang)
            : undefined,
      },
      price,
    );
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <Link
        href={`/${lang}/catalogue`}
        scroll
        className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/60 hover:text-black"
      >
        ← {t(dict, "product.back_to_catalogue")}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:items-start">
        <ProductGallery
          images={galleryImages}
          productName={pick(product.name, lang)}
          isPainting={product.kind === "paintings"}
          showAuctionBadge={Boolean(auction)}
          auctionBadgeLabel={t(dict, "auction.badge")}
          selectedIndex={selectedFront}
          viewFullLabel={t(dict, "product.viewFull")}
          closeLabel={t(dict, "product.close")}
          prevLabel={t(dict, "product.nav_prev")}
          nextLabel={t(dict, "product.nav_next")}
          prevProductHref={prevProduct ? `/${lang}/product/${prevProduct.slug}` : undefined}
          nextProductHref={nextProduct ? `/${lang}/product/${nextProduct.slug}` : undefined}
          prevProductImage={prevProduct?.image}
          nextProductImage={nextProduct?.image}
          prevProductName={prevProduct ? pick(prevProduct.name, lang) : undefined}
          nextProductName={nextProduct ? pick(nextProduct.name, lang) : undefined}
          prevProductIsPainting={prevProduct?.kind === "paintings"}
          nextProductIsPainting={nextProduct?.kind === "paintings"}
          signatureOverlaySrc={cardsMedia?.signatureOverlay}
          showSignatureOverlay={signature && hasSignatureOverlay}
          onSelect={setSelectedFront}
          onPrev={() => cycleIndex("prev")}
          onNext={() => cycleIndex("next")}
        />

        <ProductPurchasePanel
          product={product}
          lang={lang}
          dict={dict}
          typeLabel={typeLabel}
          price={price}
          hasSignature={hasSignature}
          signature={signature}
          selectedBack={selectedBack}
          printVariants={printVariants}
          selectedPrintVariantId={selectedPrintVariant?.id ?? null}
          cartQty={cartQty}
          onSignatureChange={setSignature}
          onSelectBack={(value) => {
            setSelectedBack(value);
            setSelectedFront(0);
          }}
          onSelectPrintVariant={setSelectedPrintVariantId}
          onAddToCart={handleAddToCart}
          auction={auction}
          showBidForm={showBidForm}
          setShowBidForm={setShowBidForm}
          bidForm={bidForm}
          setBidForm={setBidForm}
          isBidSubmitting={isBidSubmitting}
          bidSubmitError={bidSubmitError}
          onBidSubmit={handleBidSubmit}
          formatAuctionDate={formatAuctionDate}
        />
        <div className="lg:col-start-1 lg:col-end-2">
          <ProductInfoSections
            product={product}
            lang={lang}
            dict={dict}
            selectedBack={selectedBack}
            hasSignature={hasSignature}
          />
        </div>
      </div>
    </div>
  );
};
