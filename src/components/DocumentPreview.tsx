import type { ExportableDocument } from "@/lib/document-utils";

export function DocumentPreview({ document }: { document: ExportableDocument }) {
  return (
    <div className="rounded-xl bg-background border border-border p-5 space-y-5 max-h-[65vh] overflow-y-auto">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold mb-2">Pré-visualização</p>
        <h3 className="font-bold text-lg text-foreground">{document.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{document.subtitle}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {document.meta.map((item) => (
          <div key={item.label} className="rounded-lg bg-muted/20 border border-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">{item.label}</p>
            <p className="font-medium wrap-break-word">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 text-sm">
        {document.sections.map((section, index) => (
          <section key={`${section.title ?? "section"}-${index}`} className="space-y-2">
            {section.title && (
              <h4 className="font-semibold uppercase tracking-[0.16em] text-gold text-xs">{section.title}</h4>
            )}
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${index}-${paragraphIndex}`} className="text-muted-foreground leading-6 text-justify">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="pt-2 border-t border-border space-y-1 text-sm">
        {document.footer.map((line, index) => (
          <p key={`${line}-${index}`} className={index === document.footer.length - 1 ? "font-semibold" : "text-muted-foreground"}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}