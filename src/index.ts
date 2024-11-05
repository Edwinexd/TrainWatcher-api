import { Router } from "itty-router";

import { Trafikverket } from "./Trafikverket";


export interface Env {
    TRAFIKINFO_KEY: string;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "https://trainwatcher.edthing.com",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
}

const router = Router();

router.get("/arrivals/:station/:from", async (request, env) => {
    let station = request.params.station;
    let from = request.params.from;
    let json = await new Trafikverket(env.TRAFIKINFO_KEY).getArrivals(station, from);
    return new Response(JSON.stringify(json), {headers: {...{"Content-Type": "application/json"}, ...corsHeaders}});
});

router.get("/trains/:id", async (request, env) => {
    let id = parseInt(request.params.id);
    if (isNaN(id)) {
        return new Response(JSON.stringify({error: "Invalid id"}), {status: 400, headers: {...{"Content-Type": "application/json"}, ...corsHeaders}});
    }
    let json = await new Trafikverket(env.TRAFIKINFO_KEY).getTrain(id);
    return new Response(JSON.stringify(json), {headers: {...{"Content-Type": "application/json"}, ...corsHeaders}});
});

router.get("/stations/:id", async (request, env) => {
    let id = request.params.id;
    let json = await new Trafikverket(env.TRAFIKINFO_KEY).getStation(id);
    return new Response(JSON.stringify(json), {headers: {...{"Content-Type": "application/json"}, ...corsHeaders}});
});

router.get("*", async () => {
    return new Response(JSON.stringify({error: "Not found"}), {status: 404, headers: {...{"Content-Type": "application/json"}, ...corsHeaders}});
});

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        return await router.handle(request, env, ctx);
    }
};
