import { useCountUp } from '../../hooks/useCountUp';
import { formatCompact } from '../../utils/format';

export function CountUp({
  value,
  format = formatCompact,
  duration,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  return <>{format(useCountUp(value, duration))}</>;
}
