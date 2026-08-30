import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const LINK_CLASS = 'text-primary underline-offset-4 hover:underline';

function hrefNode(href: string, label: string, key: number): ReactNode {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link key={key} to={href} className={LINK_CLASS}>
        {label}
      </Link>
    );
  }
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer" className={`break-all ${LINK_CLASS}`}>
      {label}
    </a>
  );
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded-md bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const md = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (md) {
        nodes.push(hrefNode(md[2], md[1], key++));
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(hrefNode(token, token, key++));
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RoleGuideMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key++} className="flex list-disc flex-col gap-2 pl-5">
        {list.map((item, i) => (
          <li key={i} className="break-keep">
            {inline(item)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={key++} className="text-xl font-semibold tracking-tight break-keep">
          {inline(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key++} className="pt-2 text-lg font-semibold tracking-tight break-keep">
          {inline(line.slice(3))}
        </h2>,
      );
      continue;
    }
    blocks.push(
      <p key={key++} className="break-keep text-foreground">
        {inline(line)}
      </p>,
    );
  }
  flushList();

  return <div className="flex flex-col gap-4 text-sm leading-relaxed">{blocks}</div>;
}
