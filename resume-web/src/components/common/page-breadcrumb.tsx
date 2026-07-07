import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export type BreadcrumbItemDef = {
  label: string;
  href?: string;
};

export function PageBreadcrumb({ items }: { items: BreadcrumbItemDef[] }) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {i === items.length - 1 || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
