import { Text, TextStyle } from "pixi.js";
import { Engine } from "../../index";

export class LocalizedText<TVars extends Record<string, string | number>> extends Text {
    private key: string;
    private vars: TVars;

    constructor(key: string, vars: TVars, style: Partial<TextStyle>) {
        super({ text: Engine.getEngine().locale.t(key, vars), style });
        this.key = key;
        this.vars = vars;
    }

    /** Update specific variables and refresh the text */
    setVars(partialVars: Partial<TVars>) {
        this.vars = { ...this.vars, ...partialVars };
        this.text = Engine.getEngine().locale.t(this.key, this.vars);
    }

    /** Update text Keys and refresh the text */
    setKey(newKey: string) {
        this.key = newKey;
        this.text = Engine.getEngine().locale.t(this.key, this.vars);
    }

    /** Update & refresh the text */
    updateText(newText: string) {
        this.text = newText;
    }
    
    /** Update both key and vars, and refresh the text */
    setKeyAndVars(newKey: string, newVars: TVars) {
        this.key = newKey;
        this.vars = newVars;
        this.text = Engine.getEngine().locale.t(this.key, this.vars);
    }

}