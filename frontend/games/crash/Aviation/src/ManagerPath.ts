import { Point } from "pixi.js";

export interface PathConfig {
  segments: number;
  initialIndex: number;
}

export class PathManager {
  private pathPoint: Point[] = [];
  private pathPoint0: Point = new Point(0, 800);
  private pathPoint1: Point = new Point(500, 800);
  private pathPoint2: Point = new Point(1000, 400);
  
  private pathProgress: number = 0;
  private isFollowingPath: boolean = false;
  private pathInitialIndex: number = 6;
  
  private config: PathConfig;

  constructor(config: Partial<PathConfig> = {}) {
    this.config = {
      segments: 64,
      initialIndex: 6,
      ...config
    };
    this.pathInitialIndex = this.config.initialIndex;
  }

  // Getter/Setter methods for path data
  getPathPoint(): Point[] { 
    return this.pathPoint; 
  }
  
  getPathProgress(): number { 
    return this.pathProgress; 
  }

  getPathPointIndex (number : number): Point { 
    return this.pathPoint[number]; 
  }
  
  setPathProgress(progress: number): void { 
    this.pathProgress = Math.max(0, Math.min(1, progress)); 
  }
  
  getIsFollowingPath(): boolean { 
    return this.isFollowingPath; 
  }
  
  setIsFollowingPath(following: boolean): void { 
    this.isFollowingPath = following; 
  }

  // Control points management
  updateControlPoints(p0: Point, p1: Point, p2: Point): void {
    this.pathPoint0.copyFrom(p0);
    this.pathPoint1.copyFrom(p1);
    this.pathPoint2.copyFrom(p2);
  }

  getControlPoints(): { p0: Point; p1: Point; p2: Point } {
    return {
      p0: this.pathPoint0,
      p1: this.pathPoint1,
      p2: this.pathPoint2
    };
  }

  // Bezier calculations
  quadBezier(p0: Point, p1: Point, p2: Point, segments = 48): Point[] {
    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const u = 1 - t;
      const x = u*u*p0.x + 2*u*t*p1.x + t*t*p2.x;
      const y = u*u*p0.y + 2*u*t*p1.y + t*t*p2.y;
      pts.push(new Point(x, y));
    }
    return pts;
  }

  quadBezierInPlace(p0: Point, p1: Point, p2: Point, out: Point[]): void {
    const n = out.length - 1;
    if (n < 1) return;
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const x = u*u*p0.x + 2*u*t*p1.x + t*t*p2.x;
      const y = u*u*p0.y + 2*u*t*p1.y + t*t*p2.y;
      out[i].x = x;
      out[i].y = y;
    }
  }

  // Path creation and management
  createPath(): void {
    this.pathPoint = this.quadBezier(
      this.pathPoint0, 
      this.pathPoint1, 
      this.pathPoint2, 
      this.config.segments
    );
  }

  updatePathInPlace(p2: Point): void {
    if (this.pathPoint.length === 0) {
      this.createPath();
      return;
    }
    this.quadBezierInPlace(this.pathPoint0, this.pathPoint1, p2, this.pathPoint);
  }

  // Path position calculations
  calculatePathPosition(progress: number): Point {
    if (this.pathPoint.length < 2) return new Point(0, 0);
    
    const totalSegments = this.pathPoint.length - 1;
    const exact = Math.max(0, Math.min(1, progress)) * totalSegments;
    const idx = Math.floor(exact);
    const t = exact - idx;

    const a = this.pathPoint[Math.max(0, Math.min(idx, totalSegments))];
    const b = this.pathPoint[Math.min(idx + 1, this.pathPoint.length - 1)];

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    return new Point(x, y);
  }

  getReadyPosition(): Point {
    if (this.pathPoint.length === 0) return new Point(0, 0);
    const index = Math.min(this.pathInitialIndex, this.pathPoint.length - 1);
    return new Point(
      this.pathPoint[index]?.x || 0,
      this.pathPoint[index]?.y || 0
    );
  }

  getFlyingEndPosition(): Point {
    if (this.pathPoint.length === 0) return new Point(0, 0);
    const end = this.pathPoint[this.pathPoint.length - 1];
    return new Point(end.x, end.y);
  }

  // Progress management
  updateProgress(deltaTime: number, speed: number): boolean {
    const pathSpeed = 0.01 * deltaTime * speed;
    this.pathProgress += pathSpeed;
    
    if (this.pathProgress >= 1) {
      this.pathProgress = 1;
      this.isFollowingPath = false;
      return true; // Path completed
    }
    
    return false; // Path still in progress
  }

  // Index-based operations
  runPathStart(startIndex: number): void {
    if (this.pathPoint.length === 0) return;
    
    this.isFollowingPath = true;
    const totalSegments = this.pathPoint.length - 1;
    const clampedIndex = Math.min(startIndex, this.pathPoint.length - 1);
    const progress = clampedIndex / totalSegments;
    this.pathProgress = progress;
  }

  runPathStartIndex(): number {
    return this.pathInitialIndex;
  }

  runPathEndIndex(): number {
    if (this.pathPoint.length === 0) return 0;
    return this.pathPoint.length - 1;
  }


  getCurrentPathIndex(): number {
    if (this.pathPoint.length === 0) return 0;
    const totalSegments = this.pathPoint.length - 1;
    return Math.floor(this.pathProgress * totalSegments);
  }

  // Path validation
  isPathValid(): boolean {
    return this.pathPoint.length > 1;
  }

  getPathLength(): number {
    return this.pathPoint.length;
  }

  // Reset methods
  resetProgress(): void {
    this.pathProgress = 0;
    this.isFollowingPath = false;
  }

  reset(): void {
    this.resetProgress();
    this.pathPoint = [];
  }
}