export type PositionedReport<T> = { report: T; x: number; y: number };
export type ReportCluster<T> = { items: PositionedReport<T>[]; x: number; y: number };

/** Screen-space grouping recomputed at each zoom, without changing report locations. */
export function clusterReports<T>(
  points: PositionedReport<T>[],
  radius = 42,
): ReportCluster<T>[] {
  const groups: ReportCluster<T>[] = [];
  for (const point of points) {
    let closest: ReportCluster<T> | undefined;
    let distance = radius * radius;
    for (const group of groups) {
      const squared = (point.x - group.x) ** 2 + (point.y - group.y) ** 2;
      // Bound the complete cluster diameter, so a chain cannot join distant reports.
      if (squared <= distance && group.items.every(item =>
        (point.x - item.x) ** 2 + (point.y - item.y) ** 2 <= 4 * radius * radius,
      )) {
        closest = group;
        distance = squared;
      }
    }
    if (!closest) groups.push({ items: [point], x: point.x, y: point.y });
    else {
      const count = closest.items.length;
      closest.x = (closest.x * count + point.x) / (count + 1);
      closest.y = (closest.y * count + point.y) / (count + 1);
      closest.items.push(point);
    }
  }
  return groups;
}

export function clusterDiameter(count: number): number {
  return count <= 2 ? 32 : count <= 5 ? 36 : 40;
}

/** Small display-only offsets at close zoom; report coordinates remain unchanged. */
export function separateNearbyReports<T>(points: PositionedReport<T>[]): ReportCluster<T>[] {
  return clusterReports(points, 26).flatMap(group => {
    if (group.items.length === 1) return [group];
    const radius = Math.max(22, group.items.length * 28 / (2 * Math.PI));
    return group.items.map((item, index) => {
      const angle = index * 2 * Math.PI / group.items.length - Math.PI / 2;
      return { items: [item], x: group.x + Math.cos(angle) * radius, y: group.y + Math.sin(angle) * radius };
    });
  });
}