import * as React from "react";
import {
  RopimoPageHeader,
  RopimoPageHeaderProps,
} from "@/components/ropimo/ropimo-page-header";

export type PageHeaderProps = RopimoPageHeaderProps;

export function PageHeader(props: PageHeaderProps) {
  return <RopimoPageHeader {...props} />;
}
