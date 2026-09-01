import * as React from "react";
import {
  RopimoBreadcrumbs,
  RopimoBreadcrumbsProps,
  BreadcrumbItem,
} from "@/components/ropimo/ropimo-breadcrumbs";

export type { BreadcrumbItem };
export type AppBreadcrumbsProps = RopimoBreadcrumbsProps;

export function AppBreadcrumbs(props: AppBreadcrumbsProps) {
  return <RopimoBreadcrumbs {...props} />;
}
