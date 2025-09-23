/* eslint-disable @typescript-eslint/no-unused-vars */
import { Engine } from "game-engine";
import { Slot } from "slot-game-engine";
import { gsap } from "gsap";
import { Container, TextStyle } from "pixi.js";
import { IPosition } from "slot-game-engine/src";

const DEFAULT_FADE_IN_DURATION = 0.5;
const DEFAULT_FADE_IN_DURATION_TURBO = 0.2;

export class SymbolWinLabels extends Container {

    private usedPositions: Set<string> = new Set();
    constructor() {
        super();
        this.game = Engine.getEngine();
    }

    show(data: Slot.CascadeRunnerData, isTurbo: boolean) {
        this.usedPositions.clear();
        const numReels = this.game.slot.machine.reels.length;
        const labelStyles = new TextStyle({
            fontFamily: ["DalekPinpointBold", "Arial", "sans-serif"],
            fontWeight: "bold",
            fontSize: 45,
            fill: "#edd245",
            align: "center",
            stroke: {
                color: "#000000",
                width: 5,
            },
        });

        data.winnerSymbols?.forEach(([symbolId, positions], index) => {
            const validPosition = this.getValidPosition(positions, numReels);
            if (!validPosition) return;

            const { row, col } = validPosition;

            const cellWidth = this.game.slot.machine.machineConfig.cellWidth;
            const cellHeight = this.game.slot.machine.machineConfig.cellHeight;

            const winAmountLabel = new Engine.LocalizedText(this.game.slot.currency.format(data?.subAmounts?.[index] || 0),
                { },
                labelStyles
            );

            winAmountLabel.anchor.set(0.5);
            winAmountLabel.position.set(
                row * cellWidth + cellWidth / 2,
                col * cellHeight + cellHeight / 2
            );

            this.addChild(winAmountLabel);

            // Animate: fade in, wait, fade out
            winAmountLabel.alpha = 0;
            winAmountLabel.y += 40;

            const duration = isTurbo ? DEFAULT_FADE_IN_DURATION_TURBO : DEFAULT_FADE_IN_DURATION;

            const tl = gsap.timeline({
                onComplete: () => {
                    winAmountLabel.visible = false;
                    winAmountLabel.destroy();
                }
            });

            tl.to(winAmountLabel, {
                alpha: 1,
                y: `-=${66}`,
                duration,
                ease: "sine.out",
            }).to(winAmountLabel, {
                    alpha: 0,
                    y: `-=${66}`,
                    duration,
                    ease: "sine.in",
                }, `+=${duration}`); // add delay equal to first tween’s duration

            this.usedPositions.add(`${row},${col}`);
        });
    }

    /**
     * Returns a valid position from the given list of positions that is not adjacent to any previously used positions.
     * 
     * The function shuffles the input positions and iterates through them, skipping positions on the edge reels
     * (cannot be shown on 1st and last reel). For each position, it checks adjacency against `this.usedPositions`.
     * A position is considered adjacent if it is directly beside (horizontally) any used position.
     * 
     * @param positions - Array of available positions, each represented as an object with `row` and `col` properties.
     * @param numReels - The total number of reels, used to determine edge positions.
     * @returns An object containing the `row` and `col` of a valid position, or `null` if none is found.
     */
    private getValidPosition(positions: IPosition[], numReels: number): { row: number; col: number } | null {
        const shuffled = positions.sort(() => Math.random() - 0.5);

        for (const [row, col] of shuffled) {
            // Skip edge reels
            if (row === 0 || row === numReels - 1) continue;

            // Check adjacency
            let isAdjacent = false;
            for (const pos of this.usedPositions) {
                const [usedRow, usedCol] = pos.split(",").map(Number);
                const isBeside = Math.abs(col - usedCol) === 0 && Math.abs(row - usedRow) === 0;
                if (isBeside) {
                    isAdjacent = true;
                    break;
                }
            }

            if (!isAdjacent) {
                return { row, col };
            }
        }

        return null;
    }

    hide() {
        this.removeAllListeners();
        this.removeChildren();
    }
}
