import * as React from "react";
import {
  DashboardSquare01Icon,
  Building02Icon,
  UserGroupIcon,
  Clock01Icon,
  Calendar03Icon,
  Layout01Icon,
  Task01Icon,
  Calendar01Icon,
  Folder01Icon,
  File01Icon,
  Video01Icon,
  Settings01Icon,
  Logout01Icon,
  ArrowDown01Icon,
  UnfoldMoreIcon,
  Search01Icon,
  Notification01Icon,
  Menu01Icon,
} from "hugeicons-react";

export interface NavIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const DEFAULT_SIZE = 20;
const DEFAULT_STROKE = 1.75;

export function OverviewIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <DashboardSquare01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function DepartmentsNavIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Building02Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function TeamIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <UserGroupIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function AttendanceNavIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Clock01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function LeaveNavIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Calendar03Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function ProjectsIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Layout01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function MyTasksIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Task01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function CalendarNavIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Calendar01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function FilesIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Folder01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function DocumentsIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <File01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function MeetingsIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Video01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function SettingsIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Settings01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function LogoutIcon({ className, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Logout01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function ChevronsUpDownIcon({ className, size = 16, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <UnfoldMoreIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function ArrowDownIcon({ className, size = 14, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <ArrowDown01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function SearchIcon({ className, size = 16, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Search01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function BellIcon({ className, size = 18, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Notification01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}

export function MenuNavIcon({ className, size = 20, strokeWidth = DEFAULT_STROKE, ...props }: NavIconProps) {
  return (
    <Menu01Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
}
