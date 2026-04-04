import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch from open exchange rate API (no key needed)
    const res = await fetch('https://open.er-api.com/v6/latest/KRW');
    if (!res.ok) throw new Error('Failed to fetch exchange rates');
    
    const data = await res.json();
    
    const rates = {
      KRW: 1,
      USD: data.rates?.USD ? 1 / data.rates.USD : 0.00073,
      JPY: data.rates?.JPY ? data.rates.JPY / 1 : 0.098,
    };

    // Also get USD-based for accurate conversion
    const resUsd = await fetch('https://open.er-api.com/v6/latest/USD');
    const dataUsd = await resUsd.json();

    const result = {
      base: 'KRW',
      rates: {
        KRW: 1,
        USD: dataUsd.rates?.KRW ? 1 / dataUsd.rates.KRW : 0.00073,
        JPY: dataUsd.rates?.JPY && dataUsd.rates?.KRW ? dataUsd.rates.JPY / dataUsd.rates.KRW : 0.098,
      },
      // How much 1 unit of each currency is in KRW
      toKRW: {
        KRW: 1,
        USD: dataUsd.rates?.KRW || 1370,
        JPY: dataUsd.rates?.KRW && dataUsd.rates?.JPY ? dataUsd.rates.KRW / dataUsd.rates.JPY : 9.2,
      },
      updated_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Fallback rates
    const fallback = {
      base: 'KRW',
      rates: { KRW: 1, USD: 0.00073, JPY: 0.098 },
      toKRW: { KRW: 1, USD: 1370, JPY: 9.2 },
      updated_at: new Date().toISOString(),
      fallback: true,
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
