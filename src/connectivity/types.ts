export type Connectivity = 'good' | 'low' | 'none';

/** Label for status bar: "Status: Good data" | "Status: Low data" | "Status: No data". */
export function getConnectivityDescription(connectivity: Connectivity): string {
  const labels: Record<Connectivity, string> = {
    good: 'Status: Good data',
    low: 'Status: Low data',
    none: 'Status: No data',
  };
  return labels[connectivity];
}
