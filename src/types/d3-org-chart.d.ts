declare module "d3-org-chart" {
  type ChartNode = {
    data: unknown;
    [key: string]: unknown;
  };

  export class OrgChart {
    container(element: HTMLElement | string): this;
    data(data: unknown[]): this;
    layout(direction: "top" | "left" | "right" | "bottom"): this;
    svgWidth(width: number): this;
    svgHeight(height: number): this;
    nodeWidth(accessor: (node: ChartNode) => number): this;
    nodeHeight(accessor: (node: ChartNode) => number): this;
    childrenMargin(accessor: (node: ChartNode) => number): this;
    siblingsMargin(accessor: (node: ChartNode) => number): this;
    compactMarginBetween(accessor: (node: ChartNode) => number): this;
    compactMarginPair(accessor: (node: ChartNode) => number): this;
    compact(value: boolean): this;
    initialExpandLevel(level: number): this;
    nodeContent(renderer: (node: ChartNode) => string): this;
    buttonContent(renderer: (args: { node: ChartNode; state: unknown }) => string): this;
    nodeButtonWidth(accessor: (node: ChartNode) => number): this;
    nodeButtonHeight(accessor: (node: ChartNode) => number): this;
    nodeButtonX(accessor: (node: ChartNode) => number): this;
    nodeButtonY(accessor: (node: ChartNode) => number): this;
    linkUpdate(
      updater: (this: SVGPathElement, node: ChartNode, index: number, nodes: SVGPathElement[]) => void
    ): this;
    render(): this;
    fit(): this;
    expandAll(): this;
  }
}
