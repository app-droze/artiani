import Script from "next/script";
import { getGoogleTagId, isGoogleTagEnabled } from "@/src/lib/googleTag";

export const GoogleTag = () => {
  if (!isGoogleTagEnabled()) {
    return null;
  }

  const tagId = getGoogleTagId();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${tagId}');
        `}
      </Script>
    </>
  );
};
