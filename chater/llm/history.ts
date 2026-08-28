import config from "../config.ts";
export interface record{
    role: string;
    content: string;
}
class Recorder{
    private data:Array<record> = [];

    public add(msg:record){
        while (this.data.length >= config.historyLim) this.data.shift();
        this.data.push(msg);
    }

    public get(){
        return [...this.data];
    }
}

const recorder = new Recorder();
export default recorder;
