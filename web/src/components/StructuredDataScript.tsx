type StructuredDataScriptProps = {
  data: unknown;
};

export const StructuredDataScript = ({ data }: StructuredDataScriptProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);
