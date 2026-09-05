const defaults: Record<string, string> = {
    historyLim: "30",
    baseURL: "",
    model: "deepseek-v4-flash",
    temperature: "0.2",
    apikey: "",
    resp_delay: "7000",
    userid:""
};

export function load(key: string): string {
    return localStorage.getItem("cfg_" + key) ?? defaults[key];
}

export default {
    get apikey() { return load("apikey"); },
    get historyLim() { return Number(load("historyLim")); },
    get baseURL() { return load("baseURL"); },
    get model() { return load("model"); },
    get temperature() { return Number(load("temperature")); },
    get delay() { return Number(load("resp_delay")); },
    get userid() { return load("userid"); },
}