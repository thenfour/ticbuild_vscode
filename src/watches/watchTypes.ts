export type WatchType = 'LuaGlobal' | 'LuaExpr' | 'Memory';

export interface WatchBase {
  id: string;
  type: WatchType;
  label: string;
  createdAt: number;
  lastValueText?: string;
  lastOkAt?: number;
  lastError?: string;
  stale?: boolean;
}

export interface LuaGlobalWatch extends WatchBase {
  type: 'LuaGlobal';
  name: string;
}

export interface LuaExprWatch extends WatchBase {
  type: 'LuaExpr';
  expr: string;
}

export interface MemoryWatch extends WatchBase {
  type: 'Memory';
  expression: string;
}

export type WatchItem = LuaGlobalWatch | LuaExprWatch | MemoryWatch;

export function watchExpression(watch: WatchItem): string | undefined {
  if (watch.type === 'LuaGlobal') {
    return watch.name;
  }
  if (watch.type === 'LuaExpr') {
    return watch.expr;
  }
  return undefined;
}
