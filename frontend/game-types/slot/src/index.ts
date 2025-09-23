import { ProviderList } from "./interfaces";
import { Everymatrix } from "./providers";

export * from "./core";
export * from "./events";
export * from "./interfaces";
export * from "./machine";
export * from "./machine/Machine";
export * as Reels from "./reels";
export * as Runners from "./runners";
export * from "./SlotSymbol";
export * as Visuals from "./visuals";
export const providers: ProviderList = {
  everymatrix: Everymatrix,
};
export const VERSION = "1.0.0";
