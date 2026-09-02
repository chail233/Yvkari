import config from "../../config.ts";
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

    public save(){
        localStorage.setItem("history",JSON.stringify(this.data));
    }
    public load(){
        const local_data = localStorage.getItem("history");
        this.data = local_data ? JSON.parse(local_data) : this.data;
    }
}

const recorder = new Recorder();
export default recorder;
