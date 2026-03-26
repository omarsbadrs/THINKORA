/**
 * Metrics collection — In-memory counters, gauges, and histograms.
 *
 * Stores metrics in memory with the intent of periodically exporting them
 * to an external system (Prometheus, Datadog, etc.).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricPoint {
  name: string;
  type: "counter" | "gauge" | "histogram";
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private points: MetricPoint[] = [];
  private gauges: Map<string, MetricPoint> = new Map();

  // -----------------------------------------------------------------------
  // Counter
  // -----------------------------------------------------------------------

  /**
   * Increment a monotonic counter.  `value` defaults to 1.
   */
  increment(
    name: string,
    value = 1,
    tags?: Record<string, string>,
  ): void {
    this.points.push({
      name,
      type: "counter",
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // Gauge
  // -----------------------------------------------------------------------

  /**
   * Set the current value of a gauge (point-in-time measurement).
   * Only the latest value per name+tags combination is retained.
   */
  gauge(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    const key = this.gaugeKey(name, tags);
    this.gauges.set(key, {
      name,
      type: "gauge",
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // Histogram
  // -----------------------------------------------------------------------

  /**
   * Record a single observation for a histogram (e.g. latency, payload size).
   */
  histogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): void {
    this.points.push({
      name,
      type: "histogram",
      value,
      tags,
      timestamp: Date.now(),
    });
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  /**
   * Return all collected metric points (counters + histograms) plus the
   * latest gauge snapshots.
   */
  getMetrics(): MetricPoint[] {
    return [...this.points, ...this.gauges.values()];
  }

  /**
   * Clear all collected data.  Useful after a successful export.
   */
  reset(): void {
    this.points = [];
    this.gauges.clear();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private gaugeKey(
    name: string,
    tags?: Record<string, string>,
  ): string {
    if (!tags || Object.keys(tags).length === 0) return name;
    const sorted = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}|${sorted}`;
  }
}
