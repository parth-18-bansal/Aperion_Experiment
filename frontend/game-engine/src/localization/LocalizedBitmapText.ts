import { BitmapText, TextStyle } from "pixi.js";
import { Engine } from "../../index";

export class LocalizedBitmapText<
    T extends Record<string, string | number> = Record<string, string | number>
> extends BitmapText {
    private key: string;
    private vars: T;

    constructor(
        key: string,
        vars: T,
        style: Partial<TextStyle>
    ) {
        super(Engine.getEngine().locale.t(key, vars), style);
        this.key = key;
        this.vars = vars;
    }

    setVars(partialVars: Partial<T>) {
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
    setKeyAndVars(newKey: string, newVars: T) {
        this.key = newKey;
        this.vars = newVars;
        this.text = Engine.getEngine().locale.t(this.key, this.vars);
    }

}

