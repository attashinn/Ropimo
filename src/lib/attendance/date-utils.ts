/**
 * Date and working days calculation utilities
 */
export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
  workDays: number[] = [1, 2, 3, 4, 5]
): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (workDays.includes(day)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
