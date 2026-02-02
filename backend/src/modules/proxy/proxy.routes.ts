
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { env } from '../../core/env';

export async function proxyRoutes(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/', {
        schema: {
            querystring: z.object({
                url: z.string().url()
            }),
            response: {
                200: z.any()
            }
        }
    }, async (req, reply) => {
        const { url } = req.query;

        // Security check: unexpected protocols
        if (!url.startsWith('http')) {
            return reply.status(400).send({ error: 'Invalid URL protocol' });
        }

        try {
            const response = await fetch(url);

            if (!response.ok) {
                return reply.status(response.status).send({ error: `Upstream error: ${response.statusText}` });
            }

            const contentType = response.headers.get('content-type');
            if (contentType) {
                reply.header('Content-Type', contentType);
            }

            // Set Cache-Control to reduce load
            reply.header('Cache-Control', 'public, max-age=86400'); // 24h

            const buffer = await response.arrayBuffer();
            return reply.send(Buffer.from(buffer));

        } catch (error: any) {
            req.log.error(`Proxy error for ${url}: ${error.message}`);
            return reply.status(500).send({ error: 'Failed to fetch resource' });
        }
    });
}
