import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface ArticleBodyProps {
  markdown: string;
  className?: string;
}

// Renders library article body. Typography overrides match the mockup:
//   - 17px sans body, line-height 1.75
//   - 26px serif h2, weight 500, top margin 56px
//   - lists 17px line-height 1.8
//   - blockquote → pullquote with 2px accent left-border
//
// Raw HTML is NOT enabled. Admin content is trusted but disabling raw HTML
// keeps the surface area small and removes XSS concerns entirely.
export function ArticleBody({ markdown, className }: ArticleBodyProps) {
  return (
    <div className={cn("text-ink", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-[17px] leading-[1.75] mb-[22px] text-ink">
              {children}
            </p>
          ),
          h2: ({ children }) => (
            <h2 className="font-serif text-[26px] font-medium leading-[1.25] tracking-[-0.01em] mt-14 mb-[18px]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-serif text-[20px] font-medium leading-[1.3] mt-10 mb-3">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-[22px] marker:text-ink-fade">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-[22px] marker:text-ink-fade">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[17px] leading-[1.8] mb-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-10 pl-7 border-l-2 border-accent font-serif italic text-[20px] leading-[1.5] text-ink">
              {children}
            </blockquote>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          strong: ({ children }) => (
            <strong className="font-medium">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline decoration-rule-strong underline-offset-2 hover:decoration-accent hover:text-accent transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[14px] bg-paper-2 px-1.5 py-[1px] rounded-[2px]">
              {children}
            </code>
          ),
          hr: () => <hr className="my-12 border-rule" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
