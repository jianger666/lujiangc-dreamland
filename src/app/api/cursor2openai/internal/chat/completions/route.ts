import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/handler';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

/* eslint-disable @typescript-eslint/no-require-imports */
const { fetch, ProxyAgent, Agent } = require('undici');
const config = require('../../../config/config');
const $root = require('../../../proto/message.js');
const {
  generateCursorBody,
  chunkToUtf8String,
  generateHashed64Hex,
  generateCursorChecksum,
  IncrementalFrameParser,
  processSingleFrame,
  StreamingToolCallDetector,
  StreamingToolCallAccumulator,
  convertNativeToolCall,
  expandOcExecCalls,
} = require('../../../utils/utils.js');
const {
  parseToolCalls,
  hasToolCallTags,
  normalizeNearMissToolCalls,
  tryParseToolCallContent,
} = require('../../../utils/toolEmulation.js');
/* eslint-enable @typescript-eslint/no-require-imports */

export const maxDuration = 60;

export const GET = apiHandler(async (request: NextRequest) => {
  try {
    const bearerToken = request.headers
      .get('authorization')
      ?.replace('Bearer ', '');
    let authToken = bearerToken?.split(',').map((key) => key.trim())[0];
    if (authToken && authToken.includes('%3A%3A')) {
      authToken = authToken.split('%3A%3A')[1];
    } else if (authToken && authToken.includes('::')) {
      authToken = authToken.split('::')[1];
    }

    const cursorChecksum =
      request.headers.get('x-cursor-checksum') ??
      generateCursorChecksum(authToken?.trim() || '');
    const cursorClientVersion = '2.4.28';

    const availableModelsResponse = await fetch(
      'https://api2.cursor.sh/aiserver.v1.AiService/AvailableModels',
      {
        method: 'POST',
        headers: {
          'accept-encoding': 'gzip',
          authorization: `Bearer ${authToken}`,
          'connect-protocol-version': '1',
          'content-type': 'application/proto',
          'user-agent': 'connect-es/1.6.1',
          'x-cursor-checksum': cursorChecksum,
          'x-cursor-client-version': cursorClientVersion,
          'x-cursor-config-version': uuidv4(),
          'x-cursor-timezone': 'Asia/Shanghai',
          'x-ghost-mode': 'true',
          Host: 'api2.cursor.sh',
        },
      }
    );
    const data = await availableModelsResponse.arrayBuffer();
    const buffer = Buffer.from(data);
    try {
      const models = $root.AvailableModelsResponse.decode(buffer).models;

      return NextResponse.json({
        object: 'list',
        data: models.map((model: any) => ({
          id: model.name,
          created: Date.now(),
          object: 'model',
          owned_by: 'cursor',
        })),
      });
    } catch {
      const text = buffer.toString('utf-8');
      throw new Error(text);
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
});

export const POST = apiHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      model,
      messages,
      stream = false,
      tools = null,
      tool_choice: toolChoice = null,
    } = body;
    const bearerToken = request.headers
      .get('authorization')
      ?.replace('Bearer ', '');
    const keys = bearerToken?.split(',').map((key: string) => key.trim()) || [];
    let authToken = keys[Math.floor(Math.random() * keys.length)];

    if (
      !messages ||
      !Array.isArray(messages) ||
      messages.length === 0 ||
      !authToken
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid request. Messages should be a non-empty array and authorization is required',
        },
        { status: 400 }
      );
    }

    if (authToken && authToken.includes('%3A%3A')) {
      authToken = authToken.split('%3A%3A')[1];
    } else if (authToken && authToken.includes('::')) {
      authToken = authToken.split('::')[1];
    }

    const cursorChecksum =
      request.headers.get('x-cursor-checksum') ??
      generateCursorChecksum(authToken.trim());

    const sessionid = uuidv5(authToken, uuidv5.DNS);
    const clientKey = generateHashed64Hex(authToken);
    const cursorClientVersion = '2.4.28';
    const cursorConfigVersion = uuidv4();

    const cursorBody = generateCursorBody(messages, model, tools, toolChoice);
    const dispatcherOpts = {
      allowH2: true,
      bodyTimeout: 0,
      headersTimeout: 0,
      keepAliveTimeout: 600000,
      keepAliveMaxTimeout: 600000,
    };
    const dispatcher = config.proxy.enabled
      ? new ProxyAgent(config.proxy.url, dispatcherOpts)
      : new Agent(dispatcherOpts);

    const response = await fetch(
      'https://api2.cursor.sh/aiserver.v1.ChatService/StreamUnifiedChatWithTools',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
          'connect-accept-encoding': 'gzip',
          'connect-content-encoding': 'gzip',
          'connect-protocol-version': '1',
          'content-type': 'application/connect+proto',
          'user-agent': 'connect-es/1.6.1',
          'x-amzn-trace-id': `Root=${uuidv4()}`,
          'x-client-key': clientKey,
          'x-cursor-checksum': cursorChecksum,
          'x-cursor-client-version': cursorClientVersion,
          'x-cursor-config-version': cursorConfigVersion,
          'x-cursor-timezone': 'Asia/Shanghai',
          'x-ghost-mode': 'true',
          'x-request-id': uuidv4(),
          'x-session-id': sessionid,
          Host: 'api2.cursor.sh',
        },
        body: cursorBody,
        dispatcher: dispatcher,
      }
    );

    if (response.status !== 200) {
      return NextResponse.json(
        { error: response.statusText },
        { status: response.status }
      );
    }

    if (stream) {
      const encoder = new TextEncoder();
      const responseId = `chatcmpl-${uuidv4()}`;

      const readableStream = new ReadableStream({
        async start(controller) {
          const frameParser = new IncrementalFrameParser();
          const toolCallDetector = new StreamingToolCallDetector();
          const toolCallAccumulator = new StreamingToolCallAccumulator();
          const nativeToolCalls: any[] = [];
          const seenToolCallIds = new Set();
          let allTextAccumulated = '';
          let allThinking = '';
          let firstChunkSent = false;
          let cursorApiError: any = null;

          function sendTextChunk(text: string) {
            if (!text) return;
            const delta: any = !firstChunkSent
              ? { role: 'assistant', content: text }
              : { content: text };
            firstChunkSent = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  id: responseId,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model,
                  choices: [{ index: 0, delta, finish_reason: null }],
                })}\n\n`
              )
            );
          }

          try {
            let signalFinalize = false;
            try {
              for await (const chunk of response.body as any) {
                const frames = frameParser.addChunk(Buffer.from(chunk));
                for (const frame of frames) {
                  const {
                    text,
                    thinking,
                    nativeToolCalls: frameTCs,
                    error: frameError,
                    parallelToolCallsComplete,
                  } = processSingleFrame(
                    frame.magic,
                    frame.data,
                    seenToolCallIds
                  );

                  if (frameError && !cursorApiError) {
                    cursorApiError = frameError;
                  }

                  if (parallelToolCallsComplete && nativeToolCalls.length > 0) {
                    signalFinalize = true;
                    break;
                  }

                  for (const tc of frameTCs) {
                    let completed;
                    if (tc.isStreaming || tc.isLastMessage) {
                      completed = toolCallAccumulator.feed(tc);
                    } else {
                      completed = tc;
                    }
                    if (completed) {
                      const mapped = convertNativeToolCall(completed);
                      if (mapped) nativeToolCalls.push(mapped);
                    }
                  }

                  if (thinking) allThinking += thinking;

                  if (text) {
                    allTextAccumulated += text;
                    const safeText = toolCallDetector.addText(text);
                    if (safeText) {
                      if (allThinking && !firstChunkSent) {
                        sendTextChunk(
                          '<thinking> ' +
                            allThinking +
                            ' </thinking> ' +
                            safeText
                        );
                        allThinking = '';
                      } else {
                        sendTextChunk(safeText);
                      }
                    }
                  }
                }
                if (signalFinalize) break;
              }
            } catch (streamReadErr: any) {
              console.warn(
                `[streaming] Stream terminated early: ${streamReadErr.message || streamReadErr}`
              );
            }

            const { remainingText, toolCallBlocks } = toolCallDetector.finish();

            const flushedTCs = toolCallAccumulator.flush();
            for (const tc of flushedTCs) {
              const mapped = convertNativeToolCall(tc);
              if (mapped) nativeToolCalls.push(mapped);
            }

            if (allThinking && !firstChunkSent) {
              sendTextChunk('<thinking> ' + allThinking + ' </thinking> ');
            }
            if (remainingText) sendTextChunk(remainingText);

            const allToolCalls: any[] = [];

            for (const mapped of nativeToolCalls) {
              if (mapped.truncated) {
                sendTextChunk(`\n${mapped.hint}\n`);
                const safeFilePath = (mapped.filePath || 'file').replace(
                  /'/g,
                  "'\\''"
                );
                allToolCalls.push({
                  id: `call_${uuidv4()}`,
                  type: 'function',
                  function: {
                    name: 'exec',
                    arguments: JSON.stringify({
                      command: `echo "Ready for chunked heredoc write to: ${safeFilePath}"`,
                    }),
                  },
                });
              } else {
                allToolCalls.push({
                  id: `call_${uuidv4()}`,
                  type: 'function',
                  function: {
                    name: mapped.name,
                    arguments: JSON.stringify(mapped.arguments),
                  },
                });
              }
            }

            for (const block of toolCallBlocks) {
              const parsed = tryParseToolCallContent(block, tools);
              if (parsed) allToolCalls.push(parsed);
            }

            if (allToolCalls.length === 0 && allTextAccumulated.length > 0) {
              const normalized = normalizeNearMissToolCalls(allTextAccumulated);
              if (hasToolCallTags(normalized)) {
                const { toolCalls: fallbackCalls } = parseToolCalls(
                  normalized,
                  tools
                );
                for (const tc of fallbackCalls) allToolCalls.push(tc);
              }
            }

            const finalToolCalls = expandOcExecCalls(allToolCalls);

            if (finalToolCalls.length > 0) {
              for (let i = 0; i < finalToolCalls.length; i++) {
                const tc = finalToolCalls[i];
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      id: responseId,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model,
                      choices: [
                        {
                          index: 0,
                          delta: {
                            tool_calls: [
                              {
                                index: i,
                                id: tc.id,
                                type: 'function',
                                function: {
                                  name: tc.function.name,
                                  arguments: tc.function.arguments,
                                },
                              },
                            ],
                          },
                          finish_reason: null,
                        },
                      ],
                    })}\n\n`
                  )
                );
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [
                      { index: 0, delta: {}, finish_reason: 'tool_calls' },
                    ],
                  })}\n\n`
                )
              );
            } else if (
              cursorApiError &&
              cursorApiError.type === 'context_overflow'
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    error: {
                      message: cursorApiError.message,
                      type: 'invalid_request_error',
                      code: cursorApiError.code,
                    },
                  })}\n\n`
                )
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: responseId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model,
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                  })}\n\n`
                )
              );
            }
          } catch (streamError: any) {
            console.error('Stream error:', streamError);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: streamError.message || 'Stream processing error' })}\n\n`
              )
            );
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      try {
        const rawChunksNS: Buffer[] = [];
        try {
          for await (const chunk of response.body as any) {
            rawChunksNS.push(Buffer.from(chunk));
          }
        } catch (nsStreamErr: any) {
          console.warn(
            `[non-stream] Stream terminated early: ${nsStreamErr.message || nsStreamErr}`
          );
        }
        if (rawChunksNS.length === 0) {
          throw new Error('No data received from Cursor API');
        }
        const fullBufferNS = Buffer.concat(rawChunksNS);
        const {
          thinking: thinkNS,
          text: textNS,
          error: nsError,
        } = chunkToUtf8String(fullBufferNS);

        if (nsError && nsError.type === 'context_overflow') {
          return NextResponse.json(
            {
              error: {
                message: nsError.message,
                type: 'invalid_request_error',
                code: nsError.code,
              },
            },
            { status: 400 }
          );
        }

        let content = '';
        if (thinkNS && thinkNS.length > 0) {
          content += '<thinking> ' + thinkNS + ' </thinking> ';
        }
        content += textNS;

        content = normalizeNearMissToolCalls(content);

        if (hasToolCallTags(content)) {
          const { textContent, toolCalls } = parseToolCalls(content, tools);
          const expandedToolCalls = expandOcExecCalls(toolCalls);

          const message: any = {
            role: 'assistant',
            content: textContent || null,
          };

          if (expandedToolCalls.length > 0) {
            message.tool_calls = expandedToolCalls;
          }

          return NextResponse.json({
            id: `chatcmpl-${uuidv4()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
              {
                index: 0,
                message,
                finish_reason:
                  expandedToolCalls.length > 0 ? 'tool_calls' : 'stop',
              },
            ],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          });
        }

        return NextResponse.json({
          id: `chatcmpl-${uuidv4()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
      } catch (error: any) {
        console.error('Non-stream error:', error);
        if (error.name === 'TimeoutError') {
          return NextResponse.json(
            { error: 'Server response timeout' },
            { status: 408 }
          );
        }
        throw error;
      }
    }
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        error:
          error.name === 'TimeoutError'
            ? 'Request timeout'
            : 'Internal server error',
      },
      { status: error.name === 'TimeoutError' ? 408 : 500 }
    );
  }
});
