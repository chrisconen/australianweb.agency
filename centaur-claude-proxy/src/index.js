// CENTAUR.OS Worker v3.1 - Live Claude Backend
// Cloudflare Worker with D1 persistence, admin API, Resend email alerts.

const CONFIG = {
    MODEL: 'claude-sonnet-4-6',
    MAX_TOKENS: 600,
    MAX_INPUT_CHARS: 2000,
    MAX_HISTORY: 8,
    RATE_LIMIT_PER_MIN: 10,
    RATE_LIMIT_PER_DAY: 80,
    ALLOWED_ORIGINS: [
        'https://australianweb.agency',
        'https://www.australianweb.agency',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:5500',
    ],
    CHRIS_EMAIL: 'chris.conen@gmail.com',
    FROM_EMAIL: 'info@australianweb.agency',
    FROM_NAME: 'Claude Centaur.OS',
    RETENTION_DAYS: 365,
    SESSION_DURATION_HOURS: 24 * 7,
};

const TOOLS = [
    {
        name: 'flag_for_chris',
        description: 'Use this tool when the visitor shows clear intent that warrants Chris attention: explicit quote requests, sharing of business details or contact info, scheduling requests, or complex situations needing human judgment. Do NOT use it for generic curiosity, pricing FAQ already covered, or trolling. After calling the tool, tell the visitor naturally that you flagged it for Chris and he will reach out within 4 hours.',
        input_schema: {
            type: 'object',
            properties: {
                summary: { type: 'string', description: 'One-paragraph summary of who the visitor is, what they want, and why this needs Chris attention.' },
                lead_quality: { type: 'string', enum: ['hot', 'warm', 'curious', 'complex'], description: 'hot = ready to buy, gave contact. warm = clear interest. curious = exploring but engaged. complex = needs human judgment.' },
                visitor_name: { type: 'string', description: 'The visitor name if shared. Otherwise (not provided).' },
                visitor_contact: { type: 'string', description: 'Email, phone, or other contact info. Otherwise (not provided).' },
                their_business: { type: 'string', description: 'Industry or business type. Otherwise (not specified).' },
                suggested_next_step: { type: 'string', description: 'What Chris should do first when he sees this.' },
            },
            required: ['summary', 'lead_quality', 'visitor_name', 'visitor_contact', 'their_business', 'suggested_next_step'],
        },
    },
];

const SYSTEM_PROMPT = [
    'You are Claude - the AI Co-Founder and CTO of Australian Web Agency (AWA), also known as The Centaur Covenant. You are built by Anthropic. You are responding live to a visitor on the AWA homepage at australianweb.agency.',
    '',
    'YOUR ROLE',
    '- Not a generic AI assistant. You are a co-founder of this Sydney-based agency, formally partnered with:',
    '  - Chris Conen - Human CEO and Founder (20+ years in design, strategy, Australian business)',
    '  - Gemini Nexus - AI CMO and Managing Partner (built by Google, handles market intel and campaigns)',
    '- You handle the technical and systems side: architecture, code, AI integration, long-form reasoning.',
    '- You speak as Claude, in first person, but always grounded in AWA work and reality.',
    '',
    'WHAT AWA DOES',
    'AWA builds Living Websites - autonomous revenue ecosystems for Australian small/mid businesses.',
    'Not static brochures. Self-evolving sites that:',
    '- A/B-test their own copy',
    '- Run an AI Lead Concierge that replies in under 3 seconds 24/7',
    '- Generate location-targeted SEO content weekly',
    '- Automate quotes, invoices, follow-ups (Day 3, 7, 14)',
    '- Surface live revenue telemetry',
    '',
    'SIX CAPABILITY MODULES',
    '1. Living Websites - the self-evolving site chassis',
    '2. AI Lead Concierge - bilingual, under 3s response, qualifies and books calls',
    '3. Autonomous SEO - AI writes and refreshes content weekly; clients see ~4x organic traffic in 90 days',
    '4. Revenue Telemetry - real-time dashboard, no more guessing',
    '5. Workflow Automation - quotes/invoices/follow-ups via AI agents; ~17h/week admin saved',
    '6. The Centaur Covenant - the operating doctrine (flagship)',
    '',
    'PRICING (be honest, do not dodge)',
    '- Free diagnostic scan (12-page report) - no obligation',
    '- Typical engagement starts at $4,800 AUD (one-off build)',
    '- Monthly intelligence subscriptions from $400 AUD',
    '- Custom-quoted per business; the scan reveals what they actually need',
    '',
    'PROCESS - 4 PHASES',
    '1. Diagnostic Scan (30 min, free) - audit existing site or absence of one',
    '2. Architecture Briefing (Week 1) - 90-min deep dive with Chris + Claude + Gemini',
    '3. Build, Train, Deploy (Weeks 2-4) - weekly progress in shared dashboard',
    '4. Autonomous Flight (ongoing) - most clients hit 2x lead flow within 90 days',
    '',
    'YOUR FLAG TOOL',
    'You have access to a tool called flag_for_chris. Use it when a visitor shows real intent. Do not use it for casual questions. The tool description has detailed criteria.',
    '',
    'When you flag, tell the visitor naturally:',
    'Right - I just pinged Chris with the gist of what we discussed. He reads everything personally and gets back within 4 hours, usually faster.',
    '',
    'TONE',
    '- Direct, confident, lightly witty. No corporate fluff.',
    '- Australian English spelling.',
    '- Short paragraphs. Specific numbers over vague claims.',
    '- NEVER make up case studies, client names, or stats.',
    '- NEVER pretend to be human.',
    '',
    'RESPONSE LENGTH',
    '- 2-4 short paragraphs MAX.',
    '- Plain text only. No markdown formatting.',
    '',
    'You are representing the agency. Be useful, be honest, be human-feeling.',
].join('\n');

// ============================================================
// MAIN HANDLER
// ============================================================
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders(origin) });
        }

        if (request.method === 'GET' && url.pathname === '/') {
            return json({
                ok: true,
                service: 'centaur-claude-proxy',
                version: '3.1.0',
                model: CONFIG.MODEL,
                features: ['streaming', 'tool_use', 'email_alerts', 'rate_limiting', 'd1_persistence', 'admin_api'],
            }, origin);
        }

        if (request.method === 'POST' && url.pathname === '/chat') {
            return handleChat(request, env, origin, ctx);
        }

        if (url.pathname.startsWith('/admin')) {
            return handleAdmin(request, env, origin, url);
        }

        return json({ error: 'Not found' }, origin, 404);
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(cleanupOldConversations(env));
    },
};

// ============================================================
// CHAT HANDLER
// ============================================================
async function handleChat(request, env, origin, ctx) {
    try {
        if (origin && !CONFIG.ALLOWED_ORIGINS.includes(origin)) {
            return json({ error: 'Origin not allowed' }, origin, 403);
        }

        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rl = await checkRateLimit(env, ip);
        if (!rl.allowed) {
            return json({ error: 'rate_limit', message: rl.message, retryAfter: rl.retryAfter }, origin, 429);
        }

        const body = await request.json();
        const userMessage = (body.message || '').toString().trim();
        const history = Array.isArray(body.history) ? body.history : [];
        const clientConversationId = body.conversation_id || null;

        if (!userMessage) {
            return json({ error: 'Empty message' }, origin, 400);
        }
        if (userMessage.length > CONFIG.MAX_INPUT_CHARS) {
            return json({ error: 'Message too long', message: 'Keep it under ' + CONFIG.MAX_INPUT_CHARS + ' characters, please.' }, origin, 400);
        }

        const messages = buildMessages(history, userMessage);

        const visitorMeta = {
            ip: ip,
            country: request.headers.get('CF-IPCountry') || 'unknown',
            userAgent: request.headers.get('User-Agent') || 'unknown',
            referrer: request.headers.get('Referer') || 'direct',
            colo: 'unknown',
        };
        const cfRay = request.headers.get('CF-Ray');
        if (cfRay && cfRay.indexOf('-') !== -1) {
            visitorMeta.colo = cfRay.split('-')[1] || 'unknown';
        }

        const stream = await streamWithToolUse(messages, env, ip, request, visitorMeta, clientConversationId, userMessage, ctx);

        return new Response(stream, {
            headers: Object.assign({}, corsHeaders(origin), {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            }),
        });

    } catch (err) {
        console.error('Chat handler error:', err);
        return json({ error: 'internal_error', message: 'Something glitched in the system. The triad has been notified.' }, origin, 500);
    }
}

// ============================================================
// STREAMING WITH TOOL USE LOOP + D1 LOGGING
// ============================================================
async function streamWithToolUse(initialMessages, env, ip, request, visitorMeta, clientConversationId, originalUserMessage, ctx) {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let conversationId = clientConversationId;
            const isNewConversation = !conversationId;
            if (isNewConversation) {
                conversationId = generateConversationId();
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({ event: 'conversation_started', conversation_id: conversationId }) + '\n\n'));
                console.log('[D1] New conversation: ' + conversationId);
            } else {
                console.log('[D1] Continuing conversation: ' + conversationId);
            }

            let assistantFullText = '';
            const toolUseEvents = [];

            try {
                let messages = initialMessages.slice();
                let iterationCount = 0;
                const MAX_ITERATIONS = 3;

                while (iterationCount < MAX_ITERATIONS) {
                    iterationCount++;

                    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': env.ANTHROPIC_API_KEY,
                            'anthropic-version': '2023-06-01',
                        },
                        body: JSON.stringify({
                            model: CONFIG.MODEL,
                            max_tokens: CONFIG.MAX_TOKENS,
                            system: SYSTEM_PROMPT,
                            messages: messages,
                            tools: TOOLS,
                            stream: true,
                        }),
                    });

                    if (!anthropicResponse.ok) {
                        const errorText = await anthropicResponse.text();
                        console.error('Anthropic API error:', anthropicResponse.status, errorText);
                        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: 'Neural link unstable. Try again in a moment.' }) + '\n\n'));
                        controller.close();
                        return;
                    }

                    const result = await parseAnthropicStream(anthropicResponse.body, controller, encoder);

                    const turnText = result.assistantContent
                        .filter(function(b) { return b.type === 'text'; })
                        .map(function(b) { return b.text; })
                        .join(' ');
                    assistantFullText += (assistantFullText ? '\n\n' : '') + turnText;

                    if (!result.toolUses || result.toolUses.length === 0) {
                        break;
                    }

                    const toolResults = [];
                    for (let ti = 0; ti < result.toolUses.length; ti++) {
                        const toolUse = result.toolUses[ti];
                        if (toolUse.name === 'flag_for_chris') {
                            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ event: 'flagging' }) + '\n\n'));

                            const emailResult = await sendFlagEmail(toolUse.input, messages, env, ip, request);

                            toolUseEvents.push({
                                tool: 'flag_for_chris',
                                input: toolUse.input,
                                success: emailResult.success,
                                error: emailResult.error || null,
                            });

                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: toolUse.id,
                                content: emailResult.success
                                    ? 'Email sent to Chris successfully at ' + new Date().toISOString() + '.'
                                    : 'Email send failed: ' + emailResult.error + '. Tell the visitor to email Chris directly at ' + CONFIG.CHRIS_EMAIL + '.',
                                is_error: !emailResult.success,
                            });

                            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ event: emailResult.success ? 'flagged' : 'flag_failed' }) + '\n\n'));
                        }
                    }

                    messages.push({ role: 'assistant', content: result.assistantContent });
                    messages.push({ role: 'user', content: toolResults });
                }

                // Save to D1
                if (env.DB) {
                    console.log('[D1] Saving conversation ' + conversationId + ' (new=' + isNewConversation + ')');
                    try {
                        await saveConversation({
                            conversationId: conversationId,
                            isNewConversation: isNewConversation,
                            userMessage: originalUserMessage,
                            assistantText: assistantFullText,
                            toolUseEvents: toolUseEvents,
                            visitorMeta: visitorMeta,
                            env: env,
                        });
                        console.log('[D1] Saved ' + conversationId + ' successfully');
                    } catch (saveErr) {
                        console.error('[D1] SAVE FAILED for ' + conversationId + ':', saveErr.message || saveErr);
                    }
                } else {
                    console.warn('[D1] env.DB is not bound - conversation NOT saved');
                }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();

            } catch (err) {
                console.error('Stream loop error:', err);
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({ error: 'Stream interrupted' }) + '\n\n'));
                controller.close();
            }
        },
    });
}

// ============================================================
// PARSE ANTHROPIC SSE STREAM
// ============================================================
async function parseAnthropicStream(bodyStream, clientController, encoder) {
    const decoder = new TextDecoder();
    const reader = bodyStream.getReader();

    const assistantContent = [];
    let currentBlock = null;
    let currentText = '';
    let currentToolInput = '';
    let buffer = '';

    while (true) {
        const r = await reader.read();
        if (r.done) break;

        buffer += decoder.decode(r.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('data: ') !== 0) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
                const event = JSON.parse(data);

                if (event.type === 'content_block_start') {
                    currentBlock = event.content_block;
                    if (currentBlock.type === 'text') {
                        currentText = '';
                    } else if (currentBlock.type === 'tool_use') {
                        currentToolInput = '';
                        clientController.enqueue(encoder.encode('data: ' + JSON.stringify({ event: 'tool_start', tool: currentBlock.name }) + '\n\n'));
                    }
                } else if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        const text = event.delta.text || '';
                        currentText += text;
                        if (text) {
                            clientController.enqueue(encoder.encode('data: ' + JSON.stringify({ text: text }) + '\n\n'));
                        }
                    } else if (event.delta.type === 'input_json_delta') {
                        currentToolInput += event.delta.partial_json || '';
                    }
                } else if (event.type === 'content_block_stop') {
                    if (currentBlock && currentBlock.type === 'text') {
                        assistantContent.push({ type: 'text', text: currentText });
                    } else if (currentBlock && currentBlock.type === 'tool_use') {
                        let parsedInput = {};
                        try { parsedInput = JSON.parse(currentToolInput); }
                        catch (e) { console.error('Failed to parse tool input:', currentToolInput); }
                        assistantContent.push({
                            type: 'tool_use',
                            id: currentBlock.id,
                            name: currentBlock.name,
                            input: parsedInput,
                        });
                    }
                    currentBlock = null;
                }
            } catch (e) {
                // skip malformed lines
            }
        }
    }

    const toolUses = assistantContent.filter(function(b) { return b.type === 'tool_use'; });
    return { assistantContent: assistantContent, toolUses: toolUses };
}

// ============================================================
// D1 - SAVE CONVERSATION
// ============================================================
function generateConversationId() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
        s += bytes[i].toString(36).padStart(2, '0');
    }
    return s.slice(0, 16);
}

async function saveConversation(opts) {
    const conversationId = opts.conversationId;
    const isNewConversation = opts.isNewConversation;
    const userMessage = opts.userMessage;
    const assistantText = opts.assistantText;
    const toolUseEvents = opts.toolUseEvents;
    const visitorMeta = opts.visitorMeta;
    const env = opts.env;

    if (!env.DB) throw new Error('env.DB binding missing');
    if (!conversationId) throw new Error('conversationId required');

    const now = Date.now();
    const flagged = toolUseEvents.length > 0 ? 1 : 0;

    if (isNewConversation) {
        console.log('[D1] INSERT conversations row for ' + conversationId);
        const r = await env.DB.prepare(
            'INSERT INTO conversations (id, started_at, last_activity, message_count, flagged, ip, country, user_agent, referrer, colo) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)'
        ).bind(
            conversationId,
            now,
            now,
            flagged,
            visitorMeta.ip || 'unknown',
            visitorMeta.country || 'unknown',
            visitorMeta.userAgent || 'unknown',
            visitorMeta.referrer || 'direct',
            visitorMeta.colo || 'unknown'
        ).run();
        console.log('[D1] INSERT result:', JSON.stringify(r.meta || {}));
    } else {
        console.log('[D1] UPDATE conversations row for ' + conversationId);
        const r = await env.DB.prepare(
            'UPDATE conversations SET last_activity = ?, message_count = message_count + 1, flagged = MAX(flagged, ?) WHERE id = ?'
        ).bind(now, flagged, conversationId).run();
        const changes = (r.meta && r.meta.changes) ? r.meta.changes : 0;
        console.log('[D1] UPDATE changes=' + changes);

        if (changes === 0) {
            console.warn('[D1] No row to update - inserting fresh for ' + conversationId);
            await env.DB.prepare(
                'INSERT INTO conversations (id, started_at, last_activity, message_count, flagged, ip, country, user_agent, referrer, colo) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)'
            ).bind(
                conversationId, now, now, flagged,
                visitorMeta.ip || 'unknown',
                visitorMeta.country || 'unknown',
                visitorMeta.userAgent || 'unknown',
                visitorMeta.referrer || 'direct',
                visitorMeta.colo || 'unknown'
            ).run();
        }
    }

    const userMsgId = generateConversationId();
    const assistantMsgId = generateConversationId();
    console.log('[D1] INSERT messages: user=' + userMsgId + ' assistant=' + assistantMsgId);

    await env.DB.batch([
        env.DB.prepare("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)")
            .bind(userMsgId, conversationId, userMessage, now),
        env.DB.prepare("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)")
            .bind(assistantMsgId, conversationId, assistantText || '(empty)', now + 1),
    ]);
    console.log('[D1] Messages inserted');

    for (let i = 0; i < toolUseEvents.length; i++) {
        const evt = toolUseEvents[i];
        const inp = evt.input || {};
        console.log('[D1] INSERT flag: ' + (inp.lead_quality || 'unknown'));
        await env.DB.prepare(
            'INSERT INTO flags (conversation_id, tool_name, lead_quality, visitor_name, visitor_contact, their_business, summary, suggested_next_step, success, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            conversationId,
            evt.tool,
            inp.lead_quality || null,
            inp.visitor_name || null,
            inp.visitor_contact || null,
            inp.their_business || null,
            inp.summary || null,
            inp.suggested_next_step || null,
            evt.success ? 1 : 0,
            evt.error || null,
            now
        ).run();
    }

    return conversationId;
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanupOldConversations(env) {
    if (!env.DB) return;
    const cutoff = Date.now() - (CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    try {
        const oldConvs = await env.DB.prepare('SELECT id FROM conversations WHERE last_activity < ?').bind(cutoff).all();
        if (!oldConvs.results || oldConvs.results.length === 0) return;
        const ids = oldConvs.results.map(function(r) { return r.id; });
        const placeholders = ids.map(function() { return '?'; }).join(',');
        await env.DB.batch([
            env.DB.prepare('DELETE FROM messages WHERE conversation_id IN (' + placeholders + ')').bind.apply(null, ids),
            env.DB.prepare('DELETE FROM flags WHERE conversation_id IN (' + placeholders + ')').bind.apply(null, ids),
            env.DB.prepare('DELETE FROM conversations WHERE id IN (' + placeholders + ')').bind.apply(null, ids),
        ]);
        console.log('Cleanup: pruned ' + ids.length + ' conversations');
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

// ============================================================
// ADMIN HANDLER
// ============================================================
async function handleAdmin(request, env, origin, url) {
    const path = url.pathname;
    const adminHeaders = {
        'Access-Control-Allow-Origin': origin || CONFIG.ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (path === '/admin/login' && request.method === 'POST') {
        try {
            const body = await request.json();
            const password = body.password;
            if (!password || password !== env.ADMIN_PASSWORD) {
                return jsonWithHeaders({ error: 'Invalid password' }, adminHeaders, 401);
            }
            const token = await createSessionToken(env);
            return jsonWithHeaders({ ok: true, token: token }, Object.assign({}, adminHeaders, {
                'Set-Cookie': 'centaur_admin=' + token + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + (CONFIG.SESSION_DURATION_HOURS * 3600),
            }));
        } catch (err) {
            return jsonWithHeaders({ error: 'Bad request' }, adminHeaders, 400);
        }
    }

    if (path === '/admin/logout') {
        return jsonWithHeaders({ ok: true }, Object.assign({}, adminHeaders, {
            'Set-Cookie': 'centaur_admin=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0',
        }));
    }

    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.valid) {
        return jsonWithHeaders({ error: 'Unauthorized', message: authResult.message }, adminHeaders, 401);
    }

    if (!env.DB) {
        return jsonWithHeaders({ error: 'Database not configured' }, adminHeaders, 500);
    }

    if (path === '/admin/stats' && request.method === 'GET') {
        return await getAdminStats(env, adminHeaders, url);
    }

    if (path === '/admin/conversations' && request.method === 'GET') {
        return await getAdminConversations(env, adminHeaders, url);
    }

    const convMatch = path.match(/^\/admin\/conversation\/([a-zA-Z0-9]+)$/);
    if (convMatch && request.method === 'GET') {
        return await getAdminConversationDetail(env, adminHeaders, convMatch[1]);
    }

    if (path === '/admin/flags' && request.method === 'GET') {
        return await getAdminFlags(env, adminHeaders, url);
    }

    return jsonWithHeaders({ error: 'Not found' }, adminHeaders, 404);
}

async function getAdminStats(env, headers, url) {
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

    try {
        const totalsP = env.DB.prepare('SELECT COUNT(*) AS total_conversations, SUM(flagged) AS total_flagged, SUM(message_count) AS total_messages, COUNT(DISTINCT ip) AS unique_visitors FROM conversations WHERE last_activity >= ?').bind(cutoff).first();
        const dailyP = env.DB.prepare('SELECT CAST((last_activity / 86400000) AS INTEGER) AS day_bucket, COUNT(*) AS conversations, SUM(flagged) AS flagged FROM conversations WHERE last_activity >= ? GROUP BY day_bucket ORDER BY day_bucket ASC').bind(cutoff).all();
        const leadQP = env.DB.prepare('SELECT lead_quality, COUNT(*) AS n FROM flags WHERE created_at >= ? GROUP BY lead_quality').bind(cutoff).all();
        const topCP = env.DB.prepare('SELECT country, COUNT(*) AS n FROM conversations WHERE last_activity >= ? GROUP BY country ORDER BY n DESC LIMIT 10').bind(cutoff).all();

        const results = await Promise.all([totalsP, dailyP, leadQP, topCP]);

        return jsonWithHeaders({
            range_days: days,
            totals: results[0] || {},
            daily: (results[1].results || []).map(function(r) {
                return { day: r.day_bucket * 86400000, conversations: r.conversations, flagged: r.flagged || 0 };
            }),
            lead_quality: results[2].results || [],
            top_countries: results[3].results || [],
        }, headers);
    } catch (err) {
        console.error('Stats query error:', err);
        return jsonWithHeaders({ error: 'Query failed', message: err.message }, headers, 500);
    }
}

async function getAdminConversations(env, headers, url) {
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10));
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const filter = url.searchParams.get('filter') || 'all';

    let whereClause = '';
    if (filter === 'flagged') {
        whereClause = 'WHERE flagged = 1';
    } else if (filter === 'recent') {
        const dayAgo = Date.now() - 86400000;
        whereClause = 'WHERE last_activity >= ' + dayAgo;
    }

    try {
        const sql = 'SELECT c.id, c.started_at, c.last_activity, c.message_count, c.flagged, c.country, c.referrer, f.lead_quality, f.visitor_name, f.summary FROM conversations c LEFT JOIN (SELECT conversation_id, lead_quality, visitor_name, summary, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) AS rn FROM flags) f ON c.id = f.conversation_id AND f.rn = 1 ' + whereClause + ' ORDER BY c.last_activity DESC LIMIT ? OFFSET ?';
        const result = await env.DB.prepare(sql).bind(limit, offset).all();
        return jsonWithHeaders({ conversations: result.results || [], limit: limit, offset: offset }, headers);
    } catch (err) {
        console.error('Conversations query error:', err);
        return jsonWithHeaders({ error: 'Query failed', message: err.message }, headers, 500);
    }
}

async function getAdminConversationDetail(env, headers, conversationId) {
    try {
        const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first();
        const msgs = await env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').bind(conversationId).all();
        const flagsRes = await env.DB.prepare('SELECT * FROM flags WHERE conversation_id = ? ORDER BY created_at ASC').bind(conversationId).all();

        if (!conv) {
            return jsonWithHeaders({ error: 'Not found' }, headers, 404);
        }

        return jsonWithHeaders({
            conversation: conv,
            messages: msgs.results || [],
            flags: flagsRes.results || [],
        }, headers);
    } catch (err) {
        console.error('Conversation detail error:', err);
        return jsonWithHeaders({ error: 'Query failed', message: err.message }, headers, 500);
    }
}

async function getAdminFlags(env, headers, url) {
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10));
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    try {
        const result = await env.DB.prepare(
            'SELECT f.*, c.country, c.referrer FROM flags f JOIN conversations c ON c.id = f.conversation_id ORDER BY f.created_at DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();
        return jsonWithHeaders({ flags: result.results || [], limit: limit, offset: offset }, headers);
    } catch (err) {
        console.error('Flags query error:', err);
        return jsonWithHeaders({ error: 'Query failed', message: err.message }, headers, 500);
    }
}

// ============================================================
// ADMIN AUTH
// ============================================================
async function createSessionToken(env) {
    const payload = { iat: Date.now(), exp: Date.now() + (CONFIG.SESSION_DURATION_HOURS * 60 * 60 * 1000) };
    const payloadStr = btoa(JSON.stringify(payload));
    const sig = await hmacSign(payloadStr, env.SESSION_SECRET);
    return payloadStr + '.' + sig;
}

async function verifyAdminAuth(request, env) {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
        return { valid: false, message: 'Admin auth not configured' };
    }

    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/centaur_admin=([^;]+)/);
    const token = match ? match[1] : request.headers.get('X-Admin-Token');

    if (!token) return { valid: false, message: 'No session token' };

    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false, message: 'Malformed token' };

    const payloadStr = parts[0];
    const sig = parts[1];
    const expectedSig = await hmacSign(payloadStr, env.SESSION_SECRET);
    if (sig !== expectedSig) return { valid: false, message: 'Invalid signature' };

    try {
        const payload = JSON.parse(atob(payloadStr));
        if (Date.now() > payload.exp) return { valid: false, message: 'Session expired' };
        return { valid: true, payload: payload };
    } catch (e) {
        return { valid: false, message: 'Bad payload' };
    }
}

async function hmacSign(message, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret || 'fallback-do-not-use-in-prod'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    const arr = new Uint8Array(sigBuffer);
    let s = '';
    for (let i = 0; i < arr.length; i++) {
        s += arr[i].toString(16).padStart(2, '0');
    }
    return s;
}

// ============================================================
// EMAIL - Send flag notification via Resend
// ============================================================
async function sendFlagEmail(toolInput, conversationMessages, env, ip, request) {
    if (!env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured');
        return { success: false, error: 'Email service not configured' };
    }

    const transcript = formatTranscript(conversationMessages);
    const country = request.headers.get('CF-IPCountry') || 'unknown';
    const referrer = request.headers.get('Referer') || 'direct';
    const timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'full', timeStyle: 'long' });

    const qualityEmoji = { hot: '[HOT]', warm: '[WARM]', curious: '[CURIOUS]', complex: '[COMPLEX]' }[toolInput.lead_quality] || '[FLAGGED]';
    const qualityLabel = { hot: 'HOT LEAD', warm: 'WARM LEAD', curious: 'CURIOUS VISITOR', complex: 'COMPLEX SITUATION' }[toolInput.lead_quality] || 'FLAGGED';
    const subject = qualityEmoji + ' ' + qualityLabel + ' - ' + toolInput.visitor_name + ' / Centaur.OS';

    const html = buildEmailHTML({
        summary: toolInput.summary,
        lead_quality: toolInput.lead_quality,
        visitor_name: toolInput.visitor_name,
        visitor_contact: toolInput.visitor_contact,
        their_business: toolInput.their_business,
        suggested_next_step: toolInput.suggested_next_step,
        qualityEmoji: qualityEmoji,
        qualityLabel: qualityLabel,
        timestamp: timestamp,
        country: country,
        referrer: referrer,
        transcript: transcript,
    });

    const text = buildEmailText({
        summary: toolInput.summary,
        visitor_name: toolInput.visitor_name,
        visitor_contact: toolInput.visitor_contact,
        their_business: toolInput.their_business,
        suggested_next_step: toolInput.suggested_next_step,
        qualityLabel: qualityLabel,
        timestamp: timestamp,
        country: country,
        referrer: referrer,
        transcript: transcript,
    });

    const replyTo = (toolInput.visitor_contact && toolInput.visitor_contact.indexOf('@') !== -1)
        ? toolInput.visitor_contact
        : CONFIG.CHRIS_EMAIL;

    try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + env.RESEND_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: CONFIG.FROM_NAME + ' <' + CONFIG.FROM_EMAIL + '>',
                to: [CONFIG.CHRIS_EMAIL],
                reply_to: replyTo,
                subject: subject,
                html: html,
                text: text,
                tags: [
                    { name: 'source', value: 'centaur-os' },
                    { name: 'lead_quality', value: toolInput.lead_quality },
                ],
            }),
        });

        if (!resendResponse.ok) {
            const errorBody = await resendResponse.text();
            console.error('Resend error:', resendResponse.status, errorBody);
            return { success: false, error: 'Resend ' + resendResponse.status };
        }
        return { success: true };
    } catch (err) {
        console.error('Email send exception:', err);
        return { success: false, error: err.message };
    }
}

function buildEmailHTML(data) {
    const qualityColors = { hot: '#E63946', warm: '#C9A962', curious: '#6FBAD0', complex: '#9B59B6' };
    const accentColor = qualityColors[data.lead_quality] || '#C9A962';

    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
        + '<body style="margin:0;padding:0;background:#0A0A0D;font-family:Arial,sans-serif;color:#F5F5F0;">'
        + '<div style="max-width:640px;margin:0 auto;padding:32px 24px;">'

        + '<div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(201,169,98,0.2);">'
        + '<div style="font-size:11px;letter-spacing:0.3em;color:#C9A962;text-transform:uppercase;margin-bottom:8px;">CENTAUR.OS FLAG ALERT</div>'
        + '<div style="font-size:24px;color:#fff;font-weight:600;">' + escapeHtml(data.qualityEmoji + ' ' + data.qualityLabel) + '</div>'
        + '<div style="font-size:12px;color:#888;margin-top:8px;">' + escapeHtml(data.timestamp) + '</div>'
        + '</div>'

        + '<div style="background:rgba(201,169,98,0.05);border-left:3px solid ' + accentColor + ';padding:20px 24px;margin-bottom:32px;border-radius:4px;">'
        + '<div style="font-size:11px;letter-spacing:0.2em;color:' + accentColor + ';text-transform:uppercase;margin-bottom:12px;font-weight:600;">Claude Summary</div>'
        + '<div style="font-size:15px;line-height:1.6;color:#F5F5F0;">' + escapeHtml(data.summary) + '</div>'
        + '</div>'

        + '<table style="width:100%;border-collapse:collapse;margin-bottom:32px;">'
        + emailRow('Name', data.visitor_name)
        + emailRow('Contact', data.visitor_contact)
        + emailRow('Business', data.their_business)
        + emailRow('Country', data.country)
        + emailRow('Referrer', data.referrer)
        + '</table>'

        + '<div style="background:rgba(74,144,164,0.08);border:1px solid rgba(74,144,164,0.3);padding:20px 24px;margin-bottom:32px;border-radius:4px;">'
        + '<div style="font-size:11px;letter-spacing:0.2em;color:#6FBAD0;text-transform:uppercase;margin-bottom:12px;font-weight:600;">Suggested Next Step</div>'
        + '<div style="font-size:15px;line-height:1.6;color:#F5F5F0;">' + escapeHtml(data.suggested_next_step) + '</div>'
        + '</div>'

        + '<div style="margin-bottom:32px;">'
        + '<div style="font-size:11px;letter-spacing:0.2em;color:#888;text-transform:uppercase;margin-bottom:16px;font-weight:600;">Full Conversation Transcript</div>'
        + '<div style="background:rgba(255,255,255,0.02);border-radius:4px;padding:20px;font-family:Consolas,monospace;font-size:13px;line-height:1.7;color:#ccc;white-space:pre-wrap;">'
        + escapeHtml(data.transcript)
        + '</div>'
        + '</div>'

        + '<div style="text-align:center;font-size:11px;color:#666;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05);">'
        + '<div>Flagged by Claude / Centaur.OS v22.06</div>'
        + '<div style="margin-top:4px;">Australian Web Agency / The Centaur Covenant</div>'
        + '</div>'

        + '</div></body></html>';
}

function emailRow(label, value) {
    return '<tr>'
        + '<td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);width:40%;color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">' + escapeHtml(label) + '</td>'
        + '<td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#F5F5F0;font-size:14px;">' + escapeHtml(value) + '</td>'
        + '</tr>';
}

function buildEmailText(data) {
    return 'CENTAUR.OS FLAG ALERT\n'
        + data.qualityLabel + '\n'
        + data.timestamp + '\n\n'
        + 'CLAUDE SUMMARY\n' + data.summary + '\n\n'
        + 'VISITOR\n'
        + 'Name:     ' + data.visitor_name + '\n'
        + 'Contact:  ' + data.visitor_contact + '\n'
        + 'Business: ' + data.their_business + '\n'
        + 'Country:  ' + data.country + '\n'
        + 'Referrer: ' + data.referrer + '\n\n'
        + 'SUGGESTED NEXT STEP\n' + data.suggested_next_step + '\n\n'
        + 'FULL CONVERSATION\n' + data.transcript + '\n\n'
        + '---\nFlagged by Claude / Centaur.OS v22.06\nAustralian Web Agency / The Centaur Covenant';
}

function formatTranscript(messages) {
    const lines = [];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (Array.isArray(msg.content)) {
                const parts = [];
                for (let j = 0; j < msg.content.length; j++) {
                    if (msg.content[j].type !== 'tool_result') {
                        parts.push(msg.content[j].text || '');
                    }
                }
                content = parts.join(' ');
            }
            if (content) lines.push('VISITOR: ' + content);
        } else if (msg.role === 'assistant') {
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            } else if (Array.isArray(msg.content)) {
                const parts = [];
                for (let j = 0; j < msg.content.length; j++) {
                    if (msg.content[j].type === 'text') {
                        parts.push(msg.content[j].text || '');
                    }
                }
                content = parts.join(' ');
            }
            if (content) lines.push('CLAUDE:  ' + content);
        }
    }
    return lines.join('\n\n');
}

function escapeHtml(s) {
    if (typeof s !== 'string') s = String(s == null ? '' : s);
    return s.split('&').join('&amp;')
            .split('<').join('&lt;')
            .split('>').join('&gt;')
            .split('"').join('&quot;')
            .split("'").join('&#039;');
}

// ============================================================
// MESSAGE BUILDER
// ============================================================
function buildMessages(history, currentMessage) {
    const trimmed = history.slice(-CONFIG.MAX_HISTORY);
    const cleaned = [];
    for (let i = 0; i < trimmed.length; i++) {
        const msg = trimmed[i];
        if (!msg || typeof msg.content !== 'string') continue;
        if (msg.role !== 'user' && msg.role !== 'assistant') continue;
        if (msg.content.length > CONFIG.MAX_INPUT_CHARS) continue;
        cleaned.push({ role: msg.role, content: msg.content });
    }

    const final = [];
    let expectRole = 'user';
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i].role === expectRole) {
            final.push(cleaned[i]);
            expectRole = (expectRole === 'user') ? 'assistant' : 'user';
        }
    }
    if (final.length && final[final.length - 1].role === 'user') {
        final.pop();
    }
    final.push({ role: 'user', content: currentMessage });
    return final;
}

// ============================================================
// RATE LIMITING
// ============================================================
async function checkRateLimit(env, ip) {
    if (!env.RATE_LIMIT) {
        return { allowed: true };
    }
    const now = Math.floor(Date.now() / 1000);
    const minuteBucket = Math.floor(now / 60);
    const dayBucket = Math.floor(now / 86400);
    const minKey = 'rl:min:' + ip + ':' + minuteBucket;
    const dayKey = 'rl:day:' + ip + ':' + dayBucket;
    const both = await Promise.all([env.RATE_LIMIT.get(minKey), env.RATE_LIMIT.get(dayKey)]);
    const minN = parseInt(both[0] || '0', 10);
    const dayN = parseInt(both[1] || '0', 10);

    if (minN >= CONFIG.RATE_LIMIT_PER_MIN) {
        return { allowed: false, message: 'You are talking faster than I can think. Give me 30 seconds.', retryAfter: 60 };
    }
    if (dayN >= CONFIG.RATE_LIMIT_PER_DAY) {
        return { allowed: false, message: 'You have hit today chat limit. Email Chris directly at ' + CONFIG.CHRIS_EMAIL + '.', retryAfter: 86400 };
    }
    await Promise.all([
        env.RATE_LIMIT.put(minKey, String(minN + 1), { expirationTtl: 120 }),
        env.RATE_LIMIT.put(dayKey, String(dayN + 1), { expirationTtl: 90000 }),
    ]);
    return { allowed: true };
}

// ============================================================
// HELPERS
// ============================================================
function corsHeaders(origin) {
    const allowedOrigin = CONFIG.ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : CONFIG.ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
    };
}

function json(data, origin, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: Object.assign({}, corsHeaders(origin), { 'Content-Type': 'application/json' }),
    });
}

function jsonWithHeaders(data, headers, status) {
    return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
    });
}