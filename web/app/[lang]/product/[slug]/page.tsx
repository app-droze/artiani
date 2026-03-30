import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredDataScript } from "@/src/components/StructuredDataScript";
import { ProductDetailView } from "@/src/components/product/ProductDetailView";
import { getDictionary } from "@/src/i18n/getDictionary";
import { type Locale, isLocale, defaultLocale } from "@/src/i18n/locales";
import { getPhoneCaseModels } from "@/src/lib/phoneCaseModels";
import { getProductBySlug, getRelatedProducts } from "@/src/lib/catalogueQueries";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { PAINTING_TRANSFER_HOLD_MS, isPaintingProductType } from "@/src/lib/paintingReservation";
import {
  buildProductBreadcrumbStructuredData,
  buildProductSeoDescription,
  buildProductSeoTitle,
  buildProductStructuredData,
  buildSeoPageUrl,
} from "@/src/lib/seo";
import { getSupabaseAdmin } from "@/src/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{ lang: string; slug: string }>;
};

const hasActivePaintingReservation = async (productId: string) => {
  const supabase = getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - PAINTING_TRANSFER_HOLD_MS).toISOString();
  const { data: transferHoldOrders, error: transferHoldOrdersError } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "awaiting_payment")
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(50);

  if (transferHoldOrdersError) {
    console.error("[product.page] failed to fetch recent painting reservations", {
      productId,
      code: transferHoldOrdersError.code ?? null,
      message: transferHoldOrdersError.message,
      details: transferHoldOrdersError.details ?? null,
      hint: transferHoldOrdersError.hint ?? null,
    });
    return false;
  }

  const { data: pendingOrders, error: pendingOrdersError } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (pendingOrdersError) {
    console.error("[product.page] failed to fetch pending painting reservations", {
      productId,
      code: pendingOrdersError.code ?? null,
      message: pendingOrdersError.message,
      details: pendingOrdersError.details ?? null,
      hint: pendingOrdersError.hint ?? null,
    });
    return false;
  }

  const orderIds = [...new Set([...(transferHoldOrders ?? []), ...(pendingOrders ?? [])].map((order) => order.id))];
  if (orderIds.length === 0) {
    return false;
  }

  const { data: reservedItems, error: reservedItemsError } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", productId)
    .in("order_id", orderIds)
    .limit(1);

  if (reservedItemsError) {
    console.error("[product.page] failed to fetch painting reservation items", {
      productId,
      code: reservedItemsError.code ?? null,
      message: reservedItemsError.message,
      details: reservedItemsError.details ?? null,
      hint: reservedItemsError.hint ?? null,
    });
    return false;
  }

  return (reservedItems ?? []).length > 0;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const safeLang: Locale = isLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(safeLang);
  const product = await getProductBySlug(slug, safeLang);
  const baseUrl = getPublicBaseUrl();

  return {
    title: product ? buildProductSeoTitle(product, dict) : "Artiani",
    description: product ? buildProductSeoDescription(product, dict) : dict["site.description"],
    alternates: {
      canonical: product ? buildSeoPageUrl(baseUrl, safeLang, `/product/${product.slug}`) : buildSeoPageUrl(baseUrl, safeLang),
    },
    openGraph: product
      ? {
          title: buildProductSeoTitle(product, dict),
          description: buildProductSeoDescription(product, dict),
          url: buildSeoPageUrl(baseUrl, safeLang, `/product/${product.slug}`),
          type: "website",
          images: product.mainImage ? [{ url: product.mainImage, alt: product.title }] : undefined,
        }
      : undefined,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const safeLang: Locale = lang;
  const product = await getProductBySlug(slug, safeLang);

  if (!product) {
    notFound();
  }

  const [dict, relatedProducts, phoneCaseModels] = await Promise.all([
    getDictionary(safeLang),
    getRelatedProducts({
      currentProduct: product,
      lang: safeLang,
      limit: 4,
    }),
    product.productType === "phone_case" ? getPhoneCaseModels() : Promise.resolve([]),
  ]);
  const hasPaintingReservation =
    isPaintingProductType(product.productType) && product.id
      ? await hasActivePaintingReservation(product.id)
      : false;
  const baseUrl = getPublicBaseUrl();
  const productStructuredData = buildProductStructuredData({
    baseUrl,
    dict,
    lang: safeLang,
    product,
  });
  const breadcrumbStructuredData = buildProductBreadcrumbStructuredData({
    baseUrl,
    dict,
    lang: safeLang,
    product,
  });

  return (
    <>
      <StructuredDataScript data={productStructuredData} />
      <StructuredDataScript data={breadcrumbStructuredData} />
      <ProductDetailView
        product={product}
        lang={safeLang}
        dict={dict}
        relatedProducts={relatedProducts}
        phoneCaseModels={phoneCaseModels}
        hasActivePaintingReservation={hasPaintingReservation}
      />
    </>
  );
}
