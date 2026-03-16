import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, t } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getCatalogueShapeKey, getProductBySlug } from "@/src/lib/catalogueQueries";

type PageProps = {
  params: Promise<{ lang: Locale; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const safeLang = isLocale(lang) ? lang : defaultLocale;
  const product = await getProductBySlug(slug, safeLang);

  return {
    title: product ? `${product.title} | Artiani` : "Artiani",
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const product = await getProductBySlug(slug, lang);

  if (!product) {
    notFound();
  }

  const dict = await getDictionary(lang);
  const selectedVariant = product.defaultVariant ?? product.variants[0] ?? null;
  const selectedImages =
    selectedVariant && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.gallery.map((url, index) => ({
          id: `${product.id}-gallery-${index}`,
          url,
          imageType: index === 0 ? "main" : "gallery",
        }));

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10 md:py-14">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-black/45">
          {t(dict, "catalogue.common.cloth")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>
        <p className="text-sm text-black/55">
          {t(dict, `catalogue.shapes.${getCatalogueShapeKey(product.productType)}`)}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-black/[0.04]">
            {product.mainImage ? (
              <Image
                src={product.mainImage}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            ) : null}
          </div>

          {selectedImages.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-black/[0.04]"
                >
                  <Image
                    src={image.url}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 20vw"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] bg-white/75 px-5 py-5">
            <div className="space-y-3 text-sm text-black/70">
              <div className="flex items-baseline justify-between gap-4">
                <span>{t(dict, "productDetail.priceLabel")}</span>
                <span className="text-lg font-semibold text-black">
                  {(selectedVariant?.price ?? product.defaultPrice)} GEL
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span>{t(dict, "productDetail.typeLabel")}</span>
                <div className="text-right text-black">
                  <p>{t(dict, "catalogue.common.cloth")}</p>
                  <p className="text-sm text-black/55">
                    {t(dict, `catalogue.shapes.${getCatalogueShapeKey(product.productType)}`)}
                  </p>
                </div>
              </div>
              {product.materialDescription ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t(dict, "productDetail.materialLabel")}</span>
                  <span className="text-right text-black">{product.materialDescription}</span>
                </div>
              ) : null}
              {product.sizes.length > 0 ? (
                <div className="flex items-start justify-between gap-4">
                  <span>{t(dict, "productDetail.sizesLabel")}</span>
                  <span className="text-right text-black">{product.sizes.join(", ")}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-black/55">
              {t(dict, "productDetail.variantsLabel")}
            </h2>
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <div
                  key={variant.id}
                  className={`rounded-[1.25rem] px-4 py-3 text-sm ${
                    variant.id === selectedVariant?.id ? "bg-black text-white" : "bg-white/75 text-black/75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium">{variant.name}</p>
                      <p className={variant.id === selectedVariant?.id ? "text-white/75" : "text-black/55"}>
                        {[
                          variant.backgroundName,
                          variant.ornamentName,
                          variant.sizeLabel,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="font-medium">{variant.price} GEL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
