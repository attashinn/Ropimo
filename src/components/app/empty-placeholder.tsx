import * as React from "react";
import {
  RopimoEmptyState,
  RopimoEmptyStateProps,
} from "@/components/ropimo/ropimo-empty-state";

export type EmptyPlaceholderProps = RopimoEmptyStateProps;

export function EmptyPlaceholder(props: EmptyPlaceholderProps) {
  return <RopimoEmptyState {...props} />;
}
