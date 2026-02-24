"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Product } from "@/src/data/products";
import { pick } from "@/src/data/products";
import { useCart } from "@/src/components/CartProvider";
import { formatMoney } from "@/src/lib/money";
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

export const ProductDetails = ({
  product,
  lang,
  dict,
  prevProduct,
  nextProduct,
}: ProductDetailsProps) => {
  const [addText, setAddText] = useState(false);
  const [signature, setSignature] = useState(false);
  const [cardView, setCardView] = useState<"front" | "back">("front");
  const [selectedFront, setSelectedFront] = useState(0);
  const [selectedBack, setSelectedBack] = useState<"postcard" | "greeting">(
    "postcard",
  );
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const pathname = usePathname();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const { addItem, items, updateQty } = useCart();
  const { options } = product;
  const hasAddText = typeof options.addText === "number";
  const hasSignature = typeof options.signature === "number";
  const typeLabel = t(dict, `productTypes.${product.kind}`);
  const separator = t(dict, "ui.separator");
  const isPainting = product.kind === "paintings";

  const cardsMedia = product.cards;
  const hasSignatureOverlay = Boolean(cardsMedia?.signatureOverlay);

  const price = useMemo(() => {
    let total = product.price;
    if (addText && hasAddText) total += options.addText ?? 0;
    if (signature && hasSignature) total += options.signature ?? 0;
    return total;
  }, [addText, signature, product.price, hasAddText, hasSignature, options]);

  const cartItems = useMemo(
    () => items.filter((item) => item.productId === product.id),
    [items, product.id],
  );
  const showTextOption = typeof options.addText === "number";
  const showSignatureOption = typeof options.signature === "number";

  const galleryImages = useMemo(() => {
    if (product.kind === "cards") {
      return product.cards?.frontImages ?? [product.image].filter(Boolean);
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
  }, [product]);

  const activeFrontImage = galleryImages[selectedFront] ?? "";
  const backImage =
    selectedBack === "postcard"
      ? cardsMedia?.backPostcard
      : cardsMedia?.backGreeting;

  const markFailed = (src: string) => {
    if (!src) return;
    setFailedImages((prev) => (prev.includes(src) ? prev : [...prev, src]));
  };

  const isFailed = (src: string) => (src ? failedImages.includes(src) : true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const cycleIndex = (direction: "next" | "prev") => {
    if (galleryImages.length === 0) return;
    setSelectedFront((current) => {
      if (direction === "next") {
        return (current + 1) % galleryImages.length;
      }
      return (current - 1 + galleryImages.length) % galleryImages.length;
    });
  };

  const handleSwipe = (direction: "next" | "prev") => {
    if (product.kind === "cards" && cardView === "back") {
      setSelectedBack((current) =>
        current === "postcard" ? "greeting" : "postcard",
      );
      return;
    }
    cycleIndex(direction);
    if (product.kind === "cards") {
      setCardView("front");
    }
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) < 40) return;
    handleSwipe(delta > 0 ? "next" : "prev");
  };


  return (
    <div className="space-y-3">
      <Link
        href={`/${lang}/catalogue`}
        scroll
        className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/50 hover:text-black"
      >
        ← {t(dict, "product.back_to_catalogue")}
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          {product.kind === "cards" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 bg-[#f5efe7] p-4">
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white/60"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  style={{ touchAction: "pan-y" }}
                >
                  {cardView === "front" ? (
                    <>
                      {!isFailed(activeFrontImage) ? (
                        <Image
                          src={activeFrontImage}
                          alt={pick(product.name, lang)}
                          fill
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-contain p-4"
                          onError={() => markFailed(activeFrontImage)}
                        />
                      ) : null}
                      {signature && hasSignatureOverlay ? (
                        <Image
                          src={cardsMedia?.signatureOverlay ?? ""}
                          alt={t(dict, "product.option_signature")}
                          fill
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="pointer-events-none object-contain p-4"
                        />
                      ) : null}
                    </>
                  ) : backImage && !isFailed(backImage) ? (
                    <Image
                      src={backImage}
                      alt={t(dict, "product.cards_back")}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-contain p-4"
                      onError={() => markFailed(backImage)}
                    />
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                {cardView === "front" ? (
                  <div className="grid grid-cols-5 gap-2">
                    {galleryImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedFront(index);
                          setCardView("front");
                        }}
                        className={`relative aspect-[4/3] rounded-lg border ${
                          selectedFront === index
                            ? "border-black"
                            : "border-black/10"
                        } bg-[#f5efe7]`}
                      >
                        {!isFailed(image) ? (
                          <Image
                            src={image}
                            alt={`${pick(product.name, lang)} ${index + 1}`}
                            fill
                            sizes="(max-width: 640px) 20vw, 10vw"
                            className="object-contain p-2"
                            onError={() => markFailed(image)}
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    <div className="relative aspect-[4/3] rounded-lg border border-black/10 bg-[#f5efe7]">
                      {backImage && !isFailed(backImage) ? (
                        <Image
                          src={backImage}
                          alt={t(dict, "product.cards_back")}
                          fill
                          sizes="(max-width: 640px) 20vw, 10vw"
                          className="object-contain p-2"
                          onError={() => markFailed(backImage)}
                        />
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                  <button
                    type="button"
                    onClick={() => setCardView("front")}
                    className={`rounded-full border px-3 py-1.5 ${
                      cardView === "front"
                        ? "border-black bg-black text-white"
                        : "border-black/10 text-black/60"
                    }`}
                  >
                    {t(dict, "product.cards_front")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardView("back")}
                    className={`rounded-full border px-3 py-1.5 ${
                      cardView === "back"
                        ? "border-black bg-black text-white"
                        : "border-black/10 text-black/60"
                    }`}
                  >
                    {t(dict, "product.cards_back")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBack("postcard");
                      setCardView("back");
                    }}
                    className={`rounded-full border px-3 py-1.5 ${
                      selectedBack === "postcard"
                        ? "border-black bg-black text-white"
                        : "border-black/10 text-black/60"
                    }`}
                  >
                    {t(dict, "product.cards_back_postcard")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBack("greeting");
                      setCardView("back");
                    }}
                    className={`rounded-full border px-3 py-1.5 ${
                      selectedBack === "greeting"
                        ? "border-black bg-black text-white"
                        : "border-black/10 text-black/60"
                    }`}
                  >
                    {t(dict, "product.cards_back_greeting")}
                  </button>
                </div>
              </div>

              {hasSignature && hasSignatureOverlay ? (
                <div className="space-y-3 text-sm">
                  <label className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                    <span className="font-medium text-black">
                      {t(dict, "product.option_signature")}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-black/50">
                        +{formatMoney(options.signature ?? 0)}
                      </span>
                      <input
                        type="checkbox"
                        checked={signature}
                        onChange={(event) => setSignature(event.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 bg-[#f5efe7] p-4">
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white/60"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  style={{ touchAction: "pan-y" }}
                >
                  {!isFailed(activeFrontImage) ? (
                    <Image
                      src={activeFrontImage}
                      alt={pick(product.name, lang)}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-contain p-4"
                      onError={() => markFailed(activeFrontImage)}
                    />
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedFront(index)}
                    className={`relative aspect-[4/3] rounded-lg border ${
                      selectedFront === index
                        ? "border-black"
                        : "border-black/10"
                    } bg-[#f5efe7]`}
                  >
                    {!isFailed(image) ? (
                      <Image
                        src={image}
                        alt={`${pick(product.name, lang)} ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 20vw, 10vw"
                        className="object-contain p-2"
                        onError={() => markFailed(image)}
                      />
                    ) : null}
                  </button>
                ))}
              </div>

              {!isPainting ? (
                <div className="space-y-3 text-sm">
                  {hasAddText ? (
                    <label className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                      <span className="font-medium text-black">
                        {t(dict, "product.option_add_text")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-black/50">
                          +{formatMoney(options.addText ?? 0)}
                        </span>
                        <input
                          type="checkbox"
                          checked={addText}
                          onChange={(event) => setAddText(event.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                    </label>
                  ) : null}
                  {hasSignature ? (
                    <label className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3">
                      <span className="font-medium text-black">
                        {t(dict, "product.option_signature")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-black/50">
                          +{formatMoney(options.signature ?? 0)}
                        </span>
                        <input
                          type="checkbox"
                          checked={signature}
                          onChange={(event) => setSignature(event.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                    </label>
                  ) : null}
                  {!hasAddText && !hasSignature ? (
                    <p className="text-sm text-black/50">
                      {t(dict, "product.no_options")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
            {typeLabel}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            {pick(product.name, lang)}
          </h1>
          <p className="text-sm font-medium text-black/60">
            {pick(product.summary, lang)}
          </p>
          <p className="text-base text-black/60">
            {pick(product.description, lang)}
          </p>
        </div>
      </div>

      <aside className="space-y-4 rounded-2xl border border-black/10 bg-white p-6">
        <div className="space-y-1">
          <p className="text-3xl font-semibold text-black">{formatMoney(price)}</p>
        </div>
        <p className="text-sm text-black/60">
          {t(dict, "product.dispatch_note")}
        </p>
        {isPainting ? null : (
          <>
            <button
              type="button"
              onClick={() =>
                addItem(
                  product,
                  {
                    addText: hasAddText ? addText : false,
                    signature: hasSignature ? signature : false,
                    cardBack: product.kind === "cards" ? selectedBack : undefined,
                  },
                  price,
                )
              }
              className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              {t(dict, "product.add_to_cart")}
            </button>
            <Link
              href={`/${lang}/cart`}
              className="block w-full rounded-full border border-black px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              {t(dict, "product.view_cart")}
            </Link>
          </>
        )}
        {cartItems.length > 0 ? (
          <div className="space-y-2 border-t border-black/10 pt-4 text-xs text-black/60">
            <p className="uppercase tracking-[0.2em]">
              {t(dict, "product.in_cart")}
            </p>
            <div className="space-y-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <span>
                  {showTextOption ? (
                    <>
                      {item.options.addText
                        ? t(dict, "cart.option_text_yes")
                        : t(dict, "cart.option_text_no")}
                    </>
                  ) : null}
                  {showTextOption && (showSignatureOption || item.options.cardBack)
                    ? separator
                    : null}
                  {showSignatureOption ? (
                    <>
                      {item.options.signature
                        ? t(dict, "cart.option_signature_yes")
                        : t(dict, "cart.option_signature_no")}
                    </>
                  ) : null}
                  {showSignatureOption && item.options.cardBack ? separator : null}
                  {item.options.cardBack ? (
                    item.options.cardBack === "postcard"
                      ? t(dict, "product.cards_back_postcard")
                      : t(dict, "product.cards_back_greeting")
                  ) : null}
                  </span>
                  <div className="flex items-center gap-2 text-black/70">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="h-6 w-6 rounded-full border border-black/10 text-sm"
                      aria-label={t(dict, "ui.qty_decrease")}
                    >
                      −
                    </button>
                    <span>
                      {t(dict, "ui.qty_prefix")}
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="h-6 w-6 rounded-full border border-black/10 text-sm"
                      aria-label={t(dict, "ui.qty_increase")}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {prevProduct || nextProduct ? (
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-black/10 pt-6">
            {prevProduct ? (
              <Link
                href={`/${lang}/product/${prevProduct.slug}`}
                scroll
                className="group relative flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#f5efe7] p-3 text-black/60 hover:text-black"
              >
                <div className="relative h-16 w-full overflow-hidden rounded-xl border border-black/5 bg-white/60">
                  <Image
                    src={prevProduct.image}
                    alt={pick(prevProduct.name, lang)}
                    fill
                    sizes="(max-width: 1024px) 45vw, 160px"
                    className="object-contain p-2"
                  />
                </div>
                <div className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/70 text-sm text-black/70">
                  ←
                </div>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
            {nextProduct ? (
              <Link
                href={`/${lang}/product/${nextProduct.slug}`}
                scroll
                className="group relative flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#f5efe7] p-3 text-black/60 hover:text-black"
              >
                <div className="relative h-16 w-full overflow-hidden rounded-xl border border-black/5 bg-white/60">
                  <Image
                    src={nextProduct.image}
                    alt={pick(nextProduct.name, lang)}
                    fill
                    sizes="(max-width: 1024px) 45vw, 160px"
                    className="object-contain p-2"
                  />
                </div>
                <div className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/70 text-sm text-black/70">
                  →
                </div>
              </Link>
            ) : (
              <span className="flex-1" />
            )}
          </div>
        ) : null}
      </aside>
      </div>
    </div>
  );
};
