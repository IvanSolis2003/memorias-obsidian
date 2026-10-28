declare module "d3-force" {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  }

  export interface SimulationLinkDatum<N extends SimulationNodeDatum> {
    source: N | string | number;
    target: N | string | number;
    index?: number;
  }

  export interface Simulation<N extends SimulationNodeDatum> {
    nodes(): N[];
    alpha(): number;
    alpha(valor: number): this;
    alphaTarget(valor: number): this;
    alphaDecay(valor: number): this;
    velocityDecay(valor: number): this;
    force(nombre: string, fuerza: unknown): this;
    find(x: number, y: number, radio?: number): N | undefined;
    tick(iteraciones?: number): this;
    restart(): this;
    stop(): this;
    on(tipo: "tick" | "end", escucha: (() => void) | null): this;
  }

  export function forceSimulation<N extends SimulationNodeDatum>(nodos?: N[]): Simulation<N>;

  export interface ForceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>> {
    id(funcion: (nodo: N) => string): this;
    distance(valor: number | ((enlace: L) => number)): this;
    strength(valor: number | ((enlace: L) => number)): this;
  }

  export function forceLink<N extends SimulationNodeDatum, L extends SimulationLinkDatum<N>>(
    enlaces?: L[],
  ): ForceLink<N, L>;

  export interface ForceManyBody {
    strength(valor: number): this;
    theta(valor: number): this;
    distanceMax(valor: number): this;
  }

  export function forceManyBody(): ForceManyBody;

  export interface ForceCollide<N extends SimulationNodeDatum = SimulationNodeDatum> {
    radius(valor: number | ((nodo: N) => number)): this;
    strength(valor: number): this;
    iterations(valor: number): this;
  }

  export function forceCollide<N extends SimulationNodeDatum = SimulationNodeDatum>(
    radio?: number | ((nodo: N) => number),
  ): ForceCollide<N>;

  export interface ForceAxis {
    strength(valor: number): this;
  }

  export function forceX(x?: number): ForceAxis;
  export function forceY(y?: number): ForceAxis;
}
