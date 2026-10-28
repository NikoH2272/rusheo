// calcular_resultados — Supabase Edge Function
// Usa Claude Haiku (ANTHROPIC_API_KEY_RUSHEO) para extraer resultados de torneos
// POST /functions/v1/calcular_resultados
// No escribe nada en la base de datos — función pura de procesamiento

import Anthropic from 'npm:@anthropic-ai/sdk@0.32.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { raw_text, num_salas = 3, pts_kill = 1, teams = [] } = body;

    if (!raw_text?.trim()) {
      return json({ error: 'raw_text es requerido' }, 400);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY_RUSHEO');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY_RUSHEO no configurada' }, 500);

    const client = new Anthropic({ apiKey });

    const teamsHint = teams.length
      ? `\nEquipos conocidos (usa estos nombres si coinciden):\n${(teams as string[]).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';

    const prompt = `Eres un extractor de resultados de torneos de Free Fire.

Número de salas jugadas: ${num_salas}
Puntos por kill: ${pts_kill}
${teamsHint}

Datos en bruto (texto de capturas, tablas, notas, CSV, etc.):
---
${raw_text}
---

Responde ÚNICAMENTE con JSON válido. Sin texto antes ni después. Sin markdown.

Estructura:
{
  "equipos": [
    {
      "nombre": "Nombre completo del equipo",
      "tag": "TAG corto o vacío",
      "kills": [s1, s2, s3, s4, s5, s6],
      "top": [s1, s2, s3, s4, s5, s6]
    }
  ]
}

Reglas:
- Máximo 12 equipos
- kills[i] = kills en sala i (entero ≥ 0, 0 si no hay dato)
- top[i] = puntos de posición en sala i. Sistema Free Fire: 1°=12, 2°=9, 3°=8, 4°=7, 5°=6, 6°=5, 7°=4, 8°=3, 9°=2, 10°=1, 11°-12°=0
- Ambos arrays tienen SIEMPRE 6 elementos (rellenar con 0)
- Solo el JSON`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawResponse = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const match = rawResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      return json({ error: 'La IA no devolvió JSON válido', raw: rawResponse.slice(0, 400) }, 500);
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.equipos)) {
      return json({ error: 'Formato inesperado', parsed }, 500);
    }

    const equipos = parsed.equipos.slice(0, 12).map((e: any) => ({
      nombre: String(e.nombre || '').trim(),
      tag:    String(e.tag    || '').trim().toUpperCase().slice(0, 10),
      kills:  normArray(e.kills),
      top:    normArray(e.top),
    }));

    return json({
      ok: true,
      equipos,
      tokens: { input: message.usage.input_tokens, output: message.usage.output_tokens },
    });

  } catch (err) {
    console.error('[calcular_resultados]', err);
    return json({ error: (err as Error).message }, 500);
  }
});

function normArray(arr: unknown): number[] {
  const a = Array.isArray(arr) ? arr : [];
  return [...a, 0, 0, 0, 0, 0, 0].slice(0, 6).map(v => Math.max(0, parseInt(String(v)) || 0));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
