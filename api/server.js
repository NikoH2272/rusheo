// calcular_resultados API — Rusheo
// Usa Claude Haiku para extraer resultados de torneos desde texto libre
// POST /calcular_resultados → { equipos: [{nombre, tag, kills:[6], top:[6]}] }

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/calcular_resultados', async (req, res) => {
    try {
        const { raw_text, num_salas = 3, pts_kill = 1, teams = [] } = req.body;

        if (!raw_text?.trim()) {
            return res.status(400).json({ error: 'raw_text es requerido' });
        }

        const teamsHint = teams.length
            ? `\nEquipos conocidos (usa estos nombres si coinciden):\n${teams.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
            : '';

        const prompt = `Eres un extractor de resultados de torneos de Free Fire.

Número de salas jugadas: ${num_salas}
Puntos por kill configurados: ${pts_kill}
${teamsHint}

Datos en bruto (pueden ser texto de capturas de pantalla, tablas copiadas, CSV, notas, etc.):
---
${raw_text}
---

Extrae los resultados y responde ÚNICAMENTE con un JSON válido. Sin texto antes ni después. Sin markdown. Solo el JSON.

Estructura esperada:
{
  "equipos": [
    {
      "nombre": "Nombre completo del equipo",
      "tag": "TAG corto si se menciona, sino vacío",
      "kills": [s1, s2, s3, s4, s5, s6],
      "top": [s1, s2, s3, s4, s5, s6]
    }
  ]
}

Reglas:
- Incluye todos los equipos que aparezcan (máximo 12)
- "kills": número de kills por sala (entero ≥ 0). Usa 0 para salas sin dato
- "top": puntos de posición por sala. Sistema habitual de Free Fire: 1°=12, 2°=9, 3°=8, 4°=7, 5°=6, 6°=5, 7°=4, 8°=3, 9°=2, 10°=1, 11°=0, 12°=0
- Los arrays "kills" y "top" tienen SIEMPRE 6 elementos. Rellena con 0 las salas que no existan
- Si el texto da puntos totales en lugar de por sala, pon todo en sala 1 y 0 en el resto
- SOLO responde con el JSON`;

        const message = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }]
        });

        const rawResponse = message.content[0]?.text || '';

        // Extrae el JSON aunque haya texto alrededor
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(500).json({
                error: 'La IA no devolvió JSON válido',
                raw: rawResponse.slice(0, 400)
            });
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (!Array.isArray(parsed.equipos)) {
            return res.status(500).json({ error: 'Formato de respuesta inesperado', parsed });
        }

        // Normaliza los equipos
        const equipos = parsed.equipos.slice(0, 12).map(e => ({
            nombre: String(e.nombre || '').trim(),
            tag:    String(e.tag    || '').trim().toUpperCase().slice(0, 10),
            kills:  normArray(e.kills),
            top:    normArray(e.top)
        }));

        res.json({
            ok: true,
            equipos,
            num_salas_detectadas: num_salas,
            tokens: { input: message.usage.input_tokens, output: message.usage.output_tokens }
        });

    } catch (err) {
        console.error('[calcular_resultados]', err.message);
        if (err.status === 401) return res.status(401).json({ error: 'API key inválida o sin permisos' });
        if (err instanceof SyntaxError) return res.status(500).json({ error: 'JSON inválido en respuesta de la IA' });
        res.status(500).json({ error: err.message });
    }
});

function normArray(arr) {
    const a = Array.isArray(arr) ? arr : [];
    return [...a, 0, 0, 0, 0, 0, 0].slice(0, 6).map(v => Math.max(0, parseInt(v) || 0));
}

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, model: 'claude-haiku-4-5' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`calcular_resultados API lista → http://localhost:${PORT}`);
    console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✓ cargada' : '✗ falta en .env'}`);
});
