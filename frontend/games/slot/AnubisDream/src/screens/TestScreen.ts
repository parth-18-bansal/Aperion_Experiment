import { Container } from "pixi.js";
import { BigwinScreen } from "./BigwinScreen";
import { Engine } from "game-engine";
import { Slot } from "slot-game-engine";

/** The screen that holds the app */
export class TestScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main", "ui"];

  async create() {
    const bwScreen  = new BigwinScreen();

    const runner    = new Engine.Runner<Slot.BigWinRunnerData, Slot.BigWinRunnerOptions>(
      { autoStart: true, autoStartDelay: 3000 },
      { onFinish: (data, state) => { console.log("Big win finished", data, state); }},
      bwScreen
    );
    this.addChild(bwScreen);


    runner.initialize([ { amount: 500, winType: "BIG", duration : 10 } ]);
  }
}